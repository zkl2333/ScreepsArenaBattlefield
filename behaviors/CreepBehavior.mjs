import { Creep } from "game/prototypes";
import { BattleController } from "../controllers/BattleController.mjs";

/**
 * 代表游戏中 Creep 的行为
 */
export class CreepBehavior {
  /**
   * @param {Creep} creep
   * @param {BattleController} battleController
   */
  constructor(creep, battleController) {
    this.creep = creep;
    this.battleController = battleController;
    if (!this.creep.memory.name) {
      this.creep.memory.name = `${this.creep.memory.role}-${this.creep.id}`;
    }
  }

  /**
   * Creep 的主循环 会根据不同的角色执行不同的逻辑
   */
  run() {
    throw new Error("run 方法需要在子类中实现");
  }
}
