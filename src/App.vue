<script setup lang="ts">
import { ref, onMounted } from 'vue';
import Two from 'two.js';
import { Group } from "two.js/src/group";

import { Dirty } from './dirty';

const bgTheme = ref('light');

const dirty = new Dirty();

const CenterDom = ref<HTMLElement | null>(null);

const two = new Two({
  type: Two.Types.canvas,
  fullscreen: false
});

onMounted(() => {
  console.log('onMounted');
  if (!CenterDom.value) {
    console.error('no dom');
    return;
  }
  window.addEventListener('keydown', onKeydown);
  init();
  new ResizeObserver(onResize).observe(CenterDom.value);
  onResize();
  two.appendTo(CenterDom.value);
  update();
  updateTheme();
  console.log('two:', two);
});

function onResize() {
  if (!CenterDom.value) {
    return;
  }
  two.width = CenterDom.value.clientWidth;
  two.height = CenterDom.value.clientHeight;
  dirty.dirty('size');
}

let pause = false;

// 方框背景大小
let width = 10;
let height = 20;
const boxSize = 10;

let score = 0;
let maxScore = 0;

let count = 0;

// 方框类型，横向每列的像素排布；两bit表示一个格，0没有、1蓝色、2红色、3保留；从下往上
type blockType = Number[];

// 全部的类型
const blockTypes: blockType[] = [
  [1, 2, 1, 2],
  [9, 2, 1],
  [1, 2, 9],
  [1, 6, 1],
  [1, 6, 8],
  [8, 6, 1],
  [3, 3],
]

const background: number[][] = []

interface BlockState {
  type: blockType;
  dir: number;    // 旋转方向：0、1、2、3，逆时针
  color: number;  // 0表示保持颜色，1表示反色
  height: number; // 新块从20开始
};

let blockState: BlockState | undefined;

function newBlock(): BlockState {
  const ti = Math.floor(Math.random() * blockTypes.length);
  const b: BlockState = {
    type: blockTypes[ti],
    dir: 0,
    color: Math.floor(Math.random() * 2),
    height: 20,
  }
  return b;
}

function init() {
  for (let j = 0; j < height; j++) {
    const line = [];
    for (let i = 0; i < width; i++) {
      line.push(0);
    }
    background.push(line);
  }
  blockState = newBlock();
}

function onKeydown(e: KeyboardEvent) {
  // console.log('key:', e);
  switch (e.key) {
    case 'ArrowLeft':
      break;
    case 'ArrowRight':
      break;
    case 'ArrowUp':
      break;
    case 'ArrowDown':
      break;
    case ' ':
      // 暂停
      pause = !pause;
      break;
    case 'r':
      // 重新开始
      break;
    case 'c':
      // 改变背景色
      if (bgTheme.value == 'dark') {
        bgTheme.value = 'light';
      } else {
        bgTheme.value = 'dark';
      }
      updateTheme();
      break;
    case 'a':
      // 蓝向左，细调
      diff += 1;
      dirty.dirty('diff');
      break;
    case 's':
      // 蓝向右，细调
      diff -= 1;
      dirty.dirty('diff');
      break;
    case 'z':
      // 蓝向左
      diff += 10;
      dirty.dirty('diff');
      break;
    case 'x':
      // 蓝向右
      diff -= 10;
      dirty.dirty('diff');
      break;
    case 'h':
      // 帮助页面
      break;
    case '-':
      // 缩小
      scale -= 1;
      if (scale < 1) {
        scale = 1;
      }
      dirty.dirty('scale');
      break;
    case '=':
      // 放大
      scale += 1;
      dirty.dirty('scale');
      break;
  }
}

function updateTheme() {
  const ctx = (two.renderer as any).ctx;
  if (ctx) {
    switch (bgTheme.value) {
      case 'dark':
        ctx.globalCompositeOperation = 'lighter'; // 相加
        break;
      case 'light':
        ctx.globalCompositeOperation = 'multiply'; // 相乘
        break;
      default:
        console.error('invalid theme:', bgTheme);
    }
    dirty.dirty('theme');
  }
}

function next() {
  if (!blockState) {
    return;
  }
  // 下降一格
  blockState.height -= 1;
  // 判断到底
  // if (冲突) {
  //   if (消行) { 闪烁 }
  //   blockState = newBlock();
  // }
}

// 缩放
let scale = 4;

// 偏移
let diff = 0;

// 速度值，越小越快，每次动作的间隔
let speed = 2000;
let timer_prev = 0;

function timer() {
  if (pause) {
    return;
  }
  const now = Number(new Date());
  if (now - timer_prev >= speed) {
    timer_prev = now;
    next();
    dirty.dirty('timer');
  }
}

function updateBorder(isBlue: boolean): Group {
  const g = new Two.Group();
  // 上
  for (let i = 0; i < width + 2; i++) {
    if ((i % 2 == 0) == isBlue) {
      continue;
    }
    const b = new Two.Rectangle(boxSize * (i + 0.5), boxSize * 0.5, boxSize, boxSize);
    g.add(b);
  }
  // 左
  for (let i = 0; i < height; i++) {
    if ((i % 2 == 0) != isBlue) {
      continue;
    }
    const b = new Two.Rectangle(boxSize * 0.5, boxSize * (i + 1.5), boxSize, boxSize);
    g.add(b);
  }
  // 右
  for (let i = 0; i < height; i++) {
    if ((i % 2 == 0) == isBlue) {
      continue;
    }
    const b = new Two.Rectangle(boxSize * (width + 1.5), boxSize * (i + 1.5), boxSize, boxSize);
    g.add(b);
  }
  // 下
  for (let i = 0; i < width + 2; i++) {
    if ((i % 2 == 0) != isBlue) {
      continue;
    }
    const b = new Two.Rectangle(boxSize * (i + 0.5), boxSize * (height + 1.5), boxSize, boxSize);
    g.add(b);
  }

  return g;
}

function updateBackground(isBlue: boolean): Group {
  const g = new Two.Group();
  return g;
}

// 蓝色眼镜看到的
function updateBlue(): Group {
  const g = new Two.Group();
  g.add(updateBorder(true));
  g.noStroke();
  if (bgTheme.value == 'dark') {
    g.fill = '#00f';
  } else {
    g.fill = '#ff0';
  }
  g.scale = scale / 2;
  g.position.set(two.width / 2 - ((width + 2) * boxSize) * scale / 2 / 2 - diff / 2, 20);
  return g;
}

// 红色眼镜看到的
function updateRed(): Group {
  const g = new Two.Group();
  g.add(updateBorder(false));
  g.noStroke();
  if (bgTheme.value == 'dark') {
    g.fill = '#c00';
  } else {
    g.fill = '#0ff';
  }
  g.scale = scale / 2;
  g.position.set(two.width / 2 - ((width + 2) * boxSize) * scale / 2 / 2 + diff / 2, 20);
  return g;
}

// 戴眼镜看不到的颜色
function updateInfo(): Group {
  const g = new Two.Group();
  // const t = new Two.Text('GAME OVER', 100, 100);
  const t_size = new Two.Text('大小: ' + scale, 20, two.height - 60, { size: 20, alignment: 'left' });
  g.add(t_size);
  const t_diff = new Two.Text('偏移: ' + diff, 20, two.height - 100, { size: 20, alignment: 'left' });
  g.add(t_diff);
  g.noStroke();
  if (bgTheme.value == 'dark') {
    g.fill = '#030';
  } else {
    g.fill = '#fcf';
  }
  return g;
}

function update() {
  window.requestAnimationFrame(update);
  timer();
  if (!dirty.check()) {
    return;
  }

  // 蓝色
  const gb = updateBlue();

  // 红色
  const gr = updateRed();

  // 戴眼镜看不到的颜色
  const gi = updateInfo();
  
  two.clear();
  two.add(gb);
  two.add(gr);
  two.add(gi);
  two.update();
  dirty.clean();
}

</script>

<template>
  <div :class="'wrapper' + ' ' + bgTheme">
    <div class="center" ref="CenterDom"></div>
  </div>
</template>

<style lang="scss" scoped>
.wrapper {
  width: 100%;
  height: 100%;
  &.dark {
    background-color: #000;
  }
  &.light {
    background-color: #fff;
  }
  .center {
    width: 100%;
    height: 100%;
  }
}
</style>
