import { StructureSpawn, Creep, StructureContainer } from "game/prototypes";
import { RESOURCE_ENERGY } from "game/constants";
import { getObjectsByPrototype, getTicks } from "game/utils";
import { CreepBehavior } from "../behaviors/CreepBehavior.mjs";
import { SpawnManager } from "./SpawnManager.mjs";
import { CREEP_ROLE, CREEP_STATE } from "../constants.mjs";
import { REQUIRED_SOLDIERS_COUNT, NEED_WORKER_COUNT } from "../config.mjs";
import { Position } from "../utils/Position.mjs";
import { AttackerBehavior } from "../behaviors/AttackerBehavior.mjs";
import { HarvesterBehavior } from "../behaviors/HarvesterBehavior.mjs";
import { RangedAttackerBehavior } from "../behaviors/RangedAttackerBehavior.mjs";
import { VisualController } from "./VisualController.mjs";

/**
 * 战斗控制器
 */
export class BattleController {
  constructor() {
    this.mainSpawn = this.getMainSpawn();
    this.enemySpawn = this.getEnemieSpawns();
    // 设置集结点
    this.rallyPoint = this.determineRallyPoint();

    // 设置全局数据
    this.setGlobalData();

    // 挂载其他控制器
    this.spawnManager = new SpawnManager(this.mainSpawn);
    this.visualController = new VisualController();
  }

  /**
   * 设置全局数据
   */
  setGlobalData() {
    this.containers = this.getContainers();
    this.myCreeps = getObjectsByPrototype(Creep).filter((creep) => creep.my);
    this.enemies = getObjectsByPrototype(Creep).filter((creep) => !creep.my);
  }

  /**
   * 主循环
   */
  update() {
    this.setGlobalData();
    this.spawnWorkers();
    // 更新是否准备好进攻的状态
    this.updateReadyToAttack();
    // 分配 Creep 的行为
    this.assignCreepBehavior();
    // 更新 SpawnManager
    this.spawnManager.update();
    this.visualController.draw();
  }

  /**
   * 确定集结点位置
   */
  determineRallyPoint() {
    const x = this.mainSpawn.x;
    const y = this.mainSpawn.y;

    if (x < 50) {
      // 出生点在左边
      return new Position(x + 5, y);
    } else {
      // 出生点在右边
      return new Position(x - 5, y);
    }
  }

  /**
   * 更新是否准备好进攻
   */
  updateReadyToAttack() {
    // 获取所有的无组队士兵
    const mySoldiers = this.myCreeps.filter(
      (creep) =>
        !creep.memory.groupId &&
        !creep.spawning &&
        (creep.memory.role === CREEP_ROLE.ATTACKER ||
          creep.memory.role === CREEP_ROLE.RANGED_ATTACKER)
    );

    if (mySoldiers.length > 0) {
      console.log("无组队士兵", mySoldiers.map((creep) => creep.id).join(","));
    }

    // 按照兵种分组
    const soldiersAtRallyPoint = {};
    mySoldiers.forEach((creep) => {
      if (!soldiersAtRallyPoint[creep.memory.role]) {
        soldiersAtRallyPoint[creep.memory.role] = [];
      }
      soldiersAtRallyPoint[creep.memory.role].push(creep);
    });

    // 准备状态
    [CREEP_ROLE.RANGED_ATTACKER, CREEP_ROLE.ATTACKER].forEach((role) => {
      const requiredSoldiers = REQUIRED_SOLDIERS_COUNT; // 需要的士兵数量
      const spawningCount = this.spawnManager.getQueueCountByRole(role);
      const soldiers = soldiersAtRallyPoint[role] || [];
      const currentCount = soldiers.length;
      const readyToAttack = currentCount >= requiredSoldiers;

      if (readyToAttack) {
        // 如果准备好了，就把士兵分配到一个组里
        soldiers.forEach((creep) => {
          creep.memory.groupId = `${role}-${getTicks()}`;
          creep.memory.state = CREEP_STATE.ATTACKING;
        });
        console.log(`${role} 准备好了，分配到了 ${soldiers[0].memory.groupId}`);
      } else {
        if (spawningCount + currentCount < requiredSoldiers) {
          this.spawnManager.enqueue({
            role: role,
            level: 1,
          });
        }
      }
    });
  }

  /**
   * 获取我方 Spawn
   */
  getMainSpawn() {
    return getObjectsByPrototype(StructureSpawn).find((spawn) => spawn.my);
  }

  /**
   * 获取敌方 Spawn
   * @returns {StructureSpawn}
   */
  getEnemieSpawns() {
    return getObjectsByPrototype(StructureSpawn).find((spawn) => !spawn.my);
  }

  /**
   * 获取所有的 Container
   * @returns {Array<StructureContainer>}
   */
  getContainers() {
    return getObjectsByPrototype(StructureContainer).filter((container) => {
      return container.store.getUsedCapacity(RESOURCE_ENERGY) > 0;
    });
  }

  /**
   * 获取指定角色的 Creep 数量
   * @param {CREEP_ROLE[keyof CREEP_ROLE]} role
   * @returns {Number}
   */
  getAllCreepsCountByRole(role) {
    const spawningCreeps = this.spawnManager.getQueueCountByRole(role);
    const currentCreeps = this.myCreeps.filter((creep) => creep.memory?.role === role).length;
    return spawningCreeps + currentCreeps;
  }

  /**
   * 生成工人
   */
  spawnWorkers() {
    const workerConfig = {
      role: CREEP_ROLE.HARVESTER,
      level: getTicks() < 1000 ? 1 : 2,
    };
    const count = this.getAllCreepsCountByRole(workerConfig.role);
    if (count < NEED_WORKER_COUNT) {
      if (this.mainSpawn && !this.mainSpawn.spawning) {
        this.spawnManager.enqueue(workerConfig);
      }
    }
  }

  /**
   * 分配 Creep 的行为
   */
  assignCreepBehavior() {
    this.myCreeps.forEach((creep) => {
      if (creep.hits === 0 || creep.spawning) return;
      let behavior;
      switch (creep.memory.role) {
        case CREEP_ROLE.HARVESTER:
          behavior = new HarvesterBehavior(creep, this);
          break;
        case CREEP_ROLE.ATTACKER:
          behavior = new AttackerBehavior(creep, this);
          break;
        case CREEP_ROLE.RANGED_ATTACKER:
          behavior = new RangedAttackerBehavior(creep, this);
          break;
        default:
          behavior = new CreepBehavior(creep, this);
          break;
      }
      behavior.run();
    });
  }
}
