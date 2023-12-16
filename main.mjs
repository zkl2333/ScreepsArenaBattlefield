import { BattleController } from "./controllers/BattleController.mjs";

const battleController = new BattleController();

// 主循环
export function loop() {
  battleController.update();
}
