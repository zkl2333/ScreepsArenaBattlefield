/** @typedef {{x: number, y : number}} OtherPos */

import { getRange } from "game/utils";

/**
 * @class 表示网格中的位置
 * @description 用于表示网格中的位置，包含 x 和 y 坐标。
 * @param {number} x - The x coordinate.
 * @param {number} y - The y coordinate.
 */
export class Position {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  /**
   * 判断两个位置是否相等
   * @param {OtherPos} otherPos
   */
  isEqualTo(otherPos) {
    return this.x === otherPos.x && this.y === otherPos.y;
  }

  /**
   * 判断两个位置是否相邻
   * @param {OtherPos} otherPos
   */
  isInRange(otherPos, range = 3) {
    return getRange(this, otherPos) <= range;
  }
}
