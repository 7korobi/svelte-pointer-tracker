import { listen } from 'svelte/internal';

import type { POINT, POINT_WITH_SCALE, SIZE, END_LISTENER } from 'svelte-petit-utils';
import { isLegacy } from 'svelte-browser';
import { PRESS_LIMIT } from 'svelte-browser/const';
import { gesture, type OperationLimit, type OperationSwitch } from './util.js';

enum Button {
	Left
}

const noop = () => {};
const PASSIVE = false;
const FLICK_SPEED = 14;
const DIAGONAL_LIMIT_STRICT = (Math.PI * 22.5) / 180;
const DIAGONAL_LIMIT_LOOSE = (Math.PI * 67.5) / 180;

type POINTLOG = [number, number, number];

type OperationCallback<T extends HTMLElement, E, R> = (ops: Operations<T>, event: E) => R;

interface OperationsOptions<T extends HTMLElement> {
	start?: OperationCallback<T, InputEvent, boolean>;
	move?: OperationCallback<T, InputEvent, void>;
	end?: OperationCallback<T, InputEvent, void>;
	change?: OperationCallback<T, InputEvent, void>;
	wheel?: OperationCallback<T, WheelEvent, void>;
	diagonalLimit?: number;
	diagonalTangent?: number;
	rawUpdates?: boolean;
}

type OperationDiff = {
	point: POINTLOG[];
	distance: number[];
	radian: number[];
	degree: number[];

	pan: POINT[];
	wheel: POINT_WITH_SCALE[];
};

export type InputEvent = TouchEvent | PointerEvent | MouseEvent;

export class Operation {
	id!: number;
	point: POINTLOG;
	points!: POINTLOG[];
	className!: string;
	state!: OperationSwitch;

	constructor(event: Touch | PointerEvent | MouseEvent, offset: POINT) {
		const { clientX, clientY } = event;
		this.point = [clientX - offset[0], clientY - offset[1], new Date().getTime()];

		if (isTouchEvent(event)) this.id = event.identifier;
		if (isPointerEvent(event)) this.id = event.pointerId;
	}
	refresh() {
		this.className = `${this.state.move ? 'move' : ''} ${this.state.press ? 'press' : ''} ${
			this.state.swipe ? 'swipe' : ''
		} ${this.state.flick ? 'flick' : ''} ${this.state.up ? 'up' : ''} ${
			this.state.down ? 'down' : ''
		} ${this.state.left ? 'left' : ''} ${this.state.right ? 'right' : ''} ${
			this.state.longpress ? 'longpress' : ''
		}`;
	}
}

export class Operations<T extends HTMLElement> {
	options!: Required<OperationsOptions<T>>;
	gesture!: OperationLimit;
	handlerEl!: T;
	originEl!: T;

	size: SIZE;
	offset!: POINT;

	wheel!: POINT_WITH_SCALE;
	tracked: Operation[];
	current: Operation[];

	constructor(options: OperationsOptions<T>) {
		this.size = [0, 0];
		this.tracked = [];
		this.current = [];
		this.setOptions(options);
	}

	relationGap(start = -2, end = undefined) {
		const gap = relationGap(start, end, this.current[0], this.current[1]);
		this.wheel = gap.wheel[gap.wheel.length - 1];
		return gap;
	}

	updateByRect() {
		const rect = this.handlerEl.getBoundingClientRect();
		this.size = [rect.width, rect.height];
		this.offset = [rect.left, rect.top];
		return this;
	}

	setOptions({
		start = () => true,
		move = noop,
		end = noop,
		change = noop,
		wheel = noop,
		diagonalLimit = DIAGONAL_LIMIT_LOOSE,
		diagonalTangent,
		rawUpdates = false
	}: OperationsOptions<T>) {
		diagonalTangent = Math.tan(diagonalLimit);
		this.options = { change, start, move, end, wheel, rawUpdates, diagonalLimit, diagonalTangent };
		this.gesture = {
			tangent: diagonalTangent,
			flick: FLICK_SPEED * FLICK_SPEED,
			play: PRESS_LIMIT * PRESS_LIMIT
		};

		return this;
	}

	listener = (node: T) => {
		const { change, start, move, end, wheel, rawUpdates } = this.options;
		const tracker = this;

		this.handlerEl = node;
		if (!this.originEl) {
			this.originEl = node;
		}
		let bye_pointermove: END_LISTENER;
		let bye_mousemove: END_LISTENER;
		let bye_touchmove: END_LISTENER;
		const byes_base: END_LISTENER[] = [];
		byes_base.push(listen(node, 'wheel', _wheel as EventListener, PASSIVE));
		if (self.PointerEvent) {
			byes_base.push(listen(node, 'pointerdown', _pointerStart as EventListener, PASSIVE));
			byes_base.push(listen(node, 'pointerup', _pointerEnd as EventListener, PASSIVE));
			byes_base.push(listen(node, 'pointercancel', _pointerEnd as EventListener, PASSIVE));
		} else {
			byes_base.push(listen(node, 'mousedown', _pointerStart as EventListener, PASSIVE));
			byes_base.push(listen(node, 'mouseup', _pointerEnd as EventListener, PASSIVE));
			byes_base.push(listen(node, 'touchstart', _touchStart as EventListener, PASSIVE));
			byes_base.push(listen(node, 'touchend', _touchEnd as EventListener, PASSIVE));
			byes_base.push(listen(node, 'touchcancel', _touchEnd as EventListener, PASSIVE));
		}

		return {
			destroy() {
				bye_pointermove && bye_pointermove();
				bye_mousemove && bye_mousemove();
				bye_touchmove && bye_touchmove();
				byes_base.map((fn) => fn!());
			}
		};

		function _triggerPointerStart(pointer: Operation, event: InputEvent): boolean {
			pointer.points = [pointer.point];
			pointer.state = {
				move: false,
				press: false,
				swipe: false,
				flick: false,
				longpress: false,
				up: false,
				down: false,
				left: false,
				right: false
			};
			pointer.state.press = true;
			pointer.refresh();
			tracker.current.push(pointer);

			if (!start!(tracker, event)) return false;
			change!(tracker, event);
			return true;
		}

		function _pointerStart(event: PointerEvent | MouseEvent) {
			if (event.button !== Button.Left) return;

			const { offset } = tracker.updateByRect();
			if (!_triggerPointerStart(new Operation(event, offset), event)) return;

			if (isPointerEvent(event)) {
				const capturingElement =
					event.target && 'setPointerCapture' in event.target ? event.target : node;

				capturingElement.setPointerCapture(event.pointerId);

				bye_pointermove ||= listen(
					node,
					rawUpdates ? 'pointerrawupdate' : 'pointermove',
					_move as EventListener,
					PASSIVE
				);
			} else {
				// MouseEvent
				bye_mousemove ||= listen(document, 'mousemove', _move as EventListener, PASSIVE);
			}
		}

		function _touchStart(event: TouchEvent) {
			const { offset } = tracker.updateByRect();
			for (const touch of [...event.changedTouches]) {
				_triggerPointerStart(new Operation(touch, offset), event);
			}
			bye_touchmove = listen(window, 'touchmove', _move as EventListener, PASSIVE);
		}

		function getOperations(event: PointerEvent | MouseEvent | TouchEvent, offset: POINT) {
			if ('changedTouches' in event) {
				return [...event.changedTouches].map((e) => new Operation(e, offset));
			}
			if ('getCoalescedEvents' in event) {
				return event.getCoalescedEvents().map((e) => new Operation(e, offset));
			}
			return [new Operation(event, offset)];
		}

		function _move(event: PointerEvent | MouseEvent | TouchEvent) {
			const { offset } = tracker.updateByRect();
			const changedPointers = getOperations(event, offset);

			tracker.tracked = [];

			for (const pointer of changedPointers) {
				const index = tracker.current.findIndex((p) => p.id === pointer.id);

				if (index === -1) continue; // Not a pointer we're tracking

				const item = tracker.current[index];
				item.points.push((item.point = pointer.point));

				tracker.tracked.push(item);

				const [headX, headY, headT] = item.points[0];
				const [tailX, tailY, tailT] = item.point;

				gesture(tailX - headX, tailY - headY, tailT - headT, item.state, tracker.gesture);
				if (item.state.move) item.state.press = false;
				item.refresh();
			}

			if (tracker.tracked.length === 0) return;

			move!(tracker, event);
			change!(tracker, event);
		}

		function _triggerPointerEnd(pointer: Operation, event: InputEvent): boolean {
			const index = tracker.current.findIndex((p) => p.id === pointer.id);
			// Not a pointer we're interested in?
			if (index === -1) return false;

			const cancelled = event.type === 'touchcancel' || event.type === 'pointercancel';
			const item = tracker.current[index];
			if (cancelled) {
				item.point = null as any;
			}
			item.state.press = false;
			item.refresh();
			end!(tracker, event);
			change!(tracker, event);

			tracker.current.splice(index, 1);

			return true;
		}

		function _pointerEnd(event: PointerEvent | MouseEvent) {
			const { offset } = tracker.updateByRect();
			if (!_triggerPointerEnd(new Operation(event, offset), event)) return;

			if (bye_pointermove) {
				bye_pointermove();
				bye_pointermove = undefined;
			}
			if (bye_mousemove) {
				bye_mousemove();
				bye_mousemove = undefined;
			}
		}

		function _touchEnd(event: TouchEvent) {
			const { offset, size } = tracker.updateByRect();
			for (const touch of [...event.changedTouches]) {
				_triggerPointerEnd(new Operation(touch, offset), event);
			}
			if (bye_touchmove) {
				bye_touchmove();
				bye_touchmove = undefined;
			}
		}

		function _wheel(event: WheelEvent) {
			const rect = tracker.originEl.getBoundingClientRect();
			const offset = [rect.left, rect.top];

			const { clientX, clientY, deltaMode, ctrlKey } = event;
			let { deltaY } = event;

			// 1 is "lines", 0 is "pixels"
			// Firefox uses "lines" for some types of mouse
			if (deltaMode === 1) deltaY *= 15;

			// ctrlKey is true when pinch-zooming on a trackpad.
			const divisor = ctrlKey ? 100 : 300;

			const scaleDiff = 1 - deltaY / divisor;
			tracker.wheel = [clientX - offset[0], clientY - offset[1], scaleDiff];
			wheel!(tracker, event);
		}
	};
}

function isTouchEvent(event: any): event is Touch {
	return self.Touch && event instanceof Touch;
}

function isPointerEvent(event: any): event is PointerEvent {
	return self.PointerEvent && event instanceof PointerEvent;
}

function relationGap(
	start: number,
	end: number | undefined,
	a: Operation,
	b: Operation
): OperationDiff {
	const as = a.points.slice(start, end);
	const bs = b ? b.points.slice(start, end) : as;
	const size = Math.max(as.length, bs.length);
	const gap: OperationDiff = {
		point: [],
		distance: [],
		radian: [],
		degree: [],
		wheel: [],
		pan: []
	};

	if (1 < size) {
		let i = 0;
		stack(as[0], bs[0] || as[0]);
		while (++i < size) {
			stack(as[i], bs[i] || as[i]);

			const oldP = gap.point[i - 1];
			const nowP = gap.point[i];
			const oldD = gap.distance[i - 1];
			const nowD = gap.distance[i];

			const pan: POINT = [nowP[0] - oldP[0], nowP[1] - oldP[1]];

			const wheel: POINT_WITH_SCALE = [oldP[0], oldP[1], oldD ? nowD / oldD : 1];
			gap.pan.push(pan);
			gap.wheel.push(wheel);
		}
		return gap;
	} else {
		return zero(a.points);
	}

	function zero(points: POINTLOG[]): OperationDiff {
		return {
			point: [points.slice(-1)[0]],
			distance: [0],
			radian: [0],
			degree: [0],

			pan: [[0, 0]],
			wheel: [[0, 0, 1]]
		};
	}

	function stack(a: POINTLOG, b: POINTLOG) {
		const [ax, ay, at] = a;
		const [bx, by, bt] = b;
		const point: POINTLOG = [(ax + bx) / 2, (ay + by) / 2, (at + bt) / 2];
		const distance = ((bx - ax) ** 2.0 + (by - ay) ** 2.0) ** 0.5;
		const radian = Math.atan2(by - ay, bx - ax);
		const degree = (radian * 180) / Math.PI;

		gap.point.push(point);
		gap.distance.push(distance);
		gap.radian.push(radian);
		gap.degree.push(degree);
	}
}
