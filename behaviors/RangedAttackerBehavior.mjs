import { ERR_INVALID_TARGET, ERR_NOT_IN_RANGE, ERR_NO_BODYPART, OK } from "game/constants";
import { SoldierBehavior } from "./SoldierBehavior.mjs";
import { getDirection } from "game/utils";

/**
 * 远程攻击者行为类
 */
export class RangedAttackerBehavior extends SoldierBehavior {
  beforeRun() {
    this.healSelf();
  }

  // 攻击目标逻辑
  attackTarget(target) {
    const attackResult = this.creep.rangedAttack(target);
    switch (attackResult) {
      case OK:
        // 如果攻击成功，则先后退一格
        const distance = getDirection(this.creep.x - target.x, this.creep.y - target.y);
        this.creep.move(distance);
        break;
      case ERR_NOT_IN_RANGE:
        // 如果不在攻击范围内，则移动到目标附近
        this.creep.moveTo(target);
        // 顺便治疗一下队友
        this.rangeHeal();
        break;
      case ERR_NO_BODYPART:
        this.creep.moveTo(this.battleController.rallyPoint);
        break;
      case ERR_INVALID_TARGET:
        console.log("attackTarget", this.creep.memory.name, "目标无效", target);
        break;
      default:
        console.log("attackTarget", this.creep.memory.name, "攻击异常", attackResult);
        break;
    }
  }
}
