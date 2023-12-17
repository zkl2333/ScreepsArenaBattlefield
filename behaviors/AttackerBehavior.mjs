import { ERR_NOT_IN_RANGE, OK } from "game/constants";
import { SoldierBehavior } from "./SoldierBehavior.mjs";
import { getDirection } from "game/utils";

/**
 * 近战攻击者行为类
 */
export class AttackerBehavior extends SoldierBehavior {
  beforeRun() {
    // 血量低于一半时，治疗自己
    if (this.creep.hits < this.creep.hitsMax / 2) {
      this.healSelf();
    }
  }

  findPriorityTarget() {
    return this.battleController.enemySpawn;
  }

  // 攻击目标逻辑
  attackTarget(target) {
    // const distance = this.creep.getRangeTo(target);
    // 最近的敌人
    const closestEnemy = this.creep.findClosestByRange(this.battleController.enemies);
    // 最近的敌人距离
    const closestEnemyDistance = this.creep.getRangeTo(closestEnemy);
    // 最近的敌人是否是目标
    const closestEnemyIsTarget = closestEnemy.id === target.id;
    // 最近的敌人是否在攻击范围内
    const closestEnemyIsInAttackRange = closestEnemyDistance <= 1;

    // 如果目标不是最近的敌人，且最近的敌人在攻击范围内，则先攻击最近的敌人
    if (!closestEnemyIsTarget && closestEnemyIsInAttackRange) {
      target = closestEnemy;
    }

    let needHeal = false;

    const attackResult = this.creep.attack(target);
    switch (attackResult) {
      case OK:
        // 如果攻击成功，则追加一次移动
        const distance = getDirection(target.x - this.creep.x, target.y - this.creep.y);
        this.creep.move(distance);
        break;
      case ERR_NOT_IN_RANGE:
        // 如果不在攻击范围内，则移动到目标附近
        this.creep.moveTo(target);
        // 顺便治疗一下
        this.healSelf();
        this.rangeHeal();
        break;
      default:
        console.log("attackTarget", this.creep.memory.name, "攻击异常", attackResult);
        needHeal = true;
        break;
    }
  }
}
