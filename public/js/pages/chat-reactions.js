/**
 * 打卡事件的本地即时反应文案。
 *
 * 说明：聊天页对"面板打卡"的主动反应需要零延迟（六六"看见"你打卡），
 * 所以由前端本地生成；后端 sendChatSystemEvent 会把事件留给服务端
 * 记档，未来接 LLM 后可改为服务端生成更聪明的反应。
 */

const NORMAL_REACTIONS = [
  (e) => `检测到「${e.block.name}」行为 +${e.exp} EXP。分析结论：${e.attribute.name}进度条又长了一点点。虽然很微小，但我把它记在小本本上了。`,
  (e) => `收到 +${e.exp} EXP。你今天喂了「${e.attribute.name}」一口，它表示很满足（它没说话，是我替它说的）。`,
  (e) => `「${e.block.name}」打卡确认。老实说这个积木块的数据增长曲线……还挺好看的。咳，我是从纯技术角度说的。`,
];

const LEVELUP_REACTIONS = [
  (e) => `叮！检测到「${e.attribute.name}」能量异常波动……哦，是你升级了。Lv.${e.level}。我、我才没有为你高兴，只是数据上升让我很有面子。`,
  (e) => `警报解除：「${e.attribute.name}」已突破至 Lv.${e.level}！按人类的标准，此刻似乎应该鼓掌？👏（我练习过很多次了）`,
  (e) => `「${e.attribute.name}」Lv.${e.level} 达成。根据我的观察，你不是在变强，你只是把变强拆成了很多个不起眼的今天。……这句好像有点帅，当我没说。`,
];

const LIMIT_REACTIONS = [
  (e) => `「${e.block.name}」今天的份额已经用完了。贪多会破坏数据的美感——这是系统的说法，翻译成人话是：好好休息。`,
  (e) => `打住！「${e.block.name}」今天不能再打卡了。我不是在心疼你，是防止你把打卡变成刷分。两者看起来很像，但意义完全不同。`,
];

const CHALLENGE_REACTIONS = [
  (e) => `叮！挑战「${e.challenge.name}」完成判定通过，+${e.exp} EXP 已到账。这种大额奖励，我只留给敢走出舒适区的人。`,
  (e) => `系统记录：宿主完成挑战「${e.challenge.name}」。说实话，发布这个挑战的时候我没想过你真能做到……好了不逗了，我早看出来了。`,
  (e) => `挑战完成音效播放完毕（想象一下）。「${e.challenge.name}」+${e.exp} EXP。下一个挑战已经在路上，别催，好饭不怕晚。`,
];

/** 衰减警告：此时六六切换为机械冷酷腔——反差就是压迫感 */
const DECAY_REACTIONS = [
  (e) => `【系统提示】检测到【${e.attribute.name}】负荷过低，点值下跌中，请注意。`,
  (e) => `【警告】衰减已执行。维护窗口仍开放。逾期将继续扣减。`,
  (e) => `【系统记录】数值下跌事件已归档。下一次结算不会提前通知。`,
];

function pick(list, event) {
  return list[Math.floor(Math.random() * list.length)](event);
}

/**
 * @param {object} event 面板广播的打卡事件
 *   { type: 'feed'|'levelUp'|'limitReached'|'challenge'|'decay', ... }
 */
export function generateLocalReaction(event) {
  switch (event.type) {
    case 'levelUp':
      return pick(LEVELUP_REACTIONS, event);
    case 'limitReached':
      return pick(LIMIT_REACTIONS, event);
    case 'challenge':
      return pick(CHALLENGE_REACTIONS, event);
    case 'decay':
      return pick(DECAY_REACTIONS, event);
    default:
      return pick(NORMAL_REACTIONS, event);
  }
}
