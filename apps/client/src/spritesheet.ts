export const SPRITE_W = 138
export const SPRITE_H = 186

export const SPRITE_GAP = 4
export const SPRITE_PADDING = 2

export const SIZE_STYLE = `width: ${SPRITE_W}px; height: ${SPRITE_H}px;`
export const SPRITE_SHEET_BASE_URL = "$lib/assets/spritesheets"

export function calculateSpritePosition(
	col: number,
	row: number,
	col2?: number,
	row2?: number
): string {
	const offsetX = col * (SPRITE_W + SPRITE_GAP) + SPRITE_PADDING
	const offsetY = row * (SPRITE_H + SPRITE_GAP) + SPRITE_PADDING
	if (col2 === undefined || row2 === undefined)
		return `background-position: -${offsetX}px -${offsetY}px;`
	const offsetX2 = col2 * (SPRITE_W + SPRITE_GAP) + SPRITE_PADDING
	const offsetY2 = row2 * (SPRITE_H + SPRITE_GAP) + SPRITE_PADDING
	return `background-position: -${offsetX}px -${offsetY}px, -${offsetX2}px -${offsetY2}px;`
}
