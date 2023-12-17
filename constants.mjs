import { WORK, CARRY, MOVE, ATTACK, HEAL, RANGED_ATTACK, TOUGH } from "game/constants";

// Creep 的职责
export const CREEP_ROLE = {
  // 采集者
  HARVESTER: "harvester",
  // 攻击者
  ATTACKER: "attacker",
  // 远程攻击者
  RANGED_ATTACKER: "ranged-attacker",
  // 维修者
  REPAIRER: "repairer",
  // 治疗者
  HEALER: "healer",
};

// Creep 对应职责的 身体部件
export const CREEP_ROLE_BODY_PARTS = {
  [CREEP_ROLE.HARVESTER]: [MOVE, MOVE, CARRY],
  [CREEP_ROLE.ATTACKER]: [
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    ATTACK,
    ATTACK,
    ATTACK,
    ATTACK,
    ATTACK,
    HEAL,
  ],
  [CREEP_ROLE.RANGED_ATTACKER]: [
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    MOVE,
    RANGED_ATTACK,
    HEAL,
  ],
  [CREEP_ROLE.REPAIRER]: [WORK, CARRY, MOVE],
  [CREEP_ROLE.HEALER]: [HEAL, MOVE],
};

// Creep 身体部件的花费
export const bodyPartCosts = {
  [MOVE]: 50,
  [WORK]: 100,
  [CARRY]: 50,
  [ATTACK]: 80,
  [RANGED_ATTACK]: 150,
  [HEAL]: 250,
  [TOUGH]: 10,
};

// 集结状态
export const CREEP_STATE = {
  GATHERING: "gathering",
  ATTACKING: "attacking",
  GUARDING: "guarding",
};
