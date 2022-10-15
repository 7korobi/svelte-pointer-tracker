import { state } from 'svelte-browser/store';

export type OperationSwitch = {
	move: boolean;
	press: boolean;
	swipe: boolean;
	flick: boolean;
	longpress: boolean;
	up: boolean;
	down: boolean;
	left: boolean;
	right: boolean;
};

export type OperationLimit = {
	tangent: number;
	flick: number;
	play: number;
};

export function gesture(
	diffX: number,
	diffY: number,
	diffT: number,
	data: OperationSwitch,
	{ play, flick, tangent }: OperationLimit
) {
	const sizeX = Math.abs(diffX);
	const sizeY = Math.abs(diffY);
	const size = sizeX * sizeX + sizeY * sizeY;
	const speed = size / diffT;

	data.move = size > play;

	const isPreSwipeX = data.move && sizeY / sizeX < tangent;
	const isPreSwipeY = data.move && sizeX / sizeY < tangent;
	const isSwipeX = isPreSwipeX && sizeX > state.threshold[0];
	const isSwipeY = isPreSwipeY && sizeY > state.threshold[1];

	data.swipe = isSwipeX || isSwipeY;
	data.flick = data.swipe && speed >= flick;

	data.left = isSwipeX && diffX < 0;
	data.right = isSwipeX && diffX > 0;

	data.up = isSwipeY && diffY < 0;
	data.down = isSwipeY && diffY > 0;
}
