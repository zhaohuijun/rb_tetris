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
let blink = false;
let blinkTime = 500; // ms
let gameOver = false;

// 方框背景大小
let width = 10;
let height = 20;
const boxSize = 10;

let score = 0;
let maxScore = 0;

let count = 0;

// 方框类型，每列的像素排布；n空、b蓝色、r红色；从下往上; 旋转也记在这里
type BlockType = string[][][];

// 全部的类型
const blockTypes: BlockType[] = [
  [[['b'], ['r'], ['b'], ['r']], [['b', 'r', 'b', 'r']]],
  [[['b', 'r'], ['r'], ['b']], [['r'], ['b', 'r', 'b']], [['n', 'b'], ['n', 'r'], ['r', 'b']], [['b', 'r', 'b'], ['n', 'n', 'r']]],
  [[['b'], ['r'], ['b', 'r']], [['n', 'n', 'r'], ['b', 'r', 'b']], [['r', 'b'], ['n', 'r'], ['n', 'b']], [['b', 'r', 'b'], ['r']]],
  [[['b'], ['r', 'b'], ['b']], [['n', 'b'], ['b', 'r', 'b']], [['n', 'b'], ['b', 'r'], ['n', 'b']], [['b', 'r', 'b'], ['n', 'b']]],
  [[['b'], ['r', 'b'], ['n', 'r']], [['n', 'b', 'r'], ['b', 'r']]],
  [[['n', 'r'], ['r', 'b'], ['b']], [['b', 'r'], ['n', 'b', 'r']]],
  [[['b', 'r'], ['r', 'b']]],
];

// 背景，n表示空，b蓝色，r红色
let background: string[][] = [];
let backgroundBlink: string[][] = [];

interface BlockState {
  type: BlockType;
  dir: number;    // 旋转方向
  color: number;  // 0表示保持颜色，1表示反色
  height: number; // 块的高度
  left: number;   // 块的位置，举左边的距离
};

let blockState: BlockState | undefined;

function newBlock(): BlockState {
  const ti = Math.floor(Math.random() * blockTypes.length);
  const t = blockTypes[ti];
  const b: BlockState = {
    type: t,
    dir: 0,
    color: Math.floor(Math.random() * 2),
    height: height,
    left: Math.floor(width / 2 - t[0].length / 2),
  }
  return b;
}

// 空数组
function newBackground(): string[][] {
  const r: string[][] = [];
  for (let j = 0; j < height; j++) {
    const line: string[] = [];
    for (let i = 0; i < width; i++) {
      line.push('n');
    }
    r.push(line);
  }
  return r;
}

function init() {
  background = newBackground();
  backgroundBlink = newBackground();
  blockState = newBlock();
}

function onKeydown(e: KeyboardEvent) {
  // console.log('key:', e.key);
  switch (e.key) {
    case 'ArrowUp':
      if (blockState) {
        blockState.dir += 1;
        if (blockState.dir >= blockState.type.length) {
          blockState.dir = 0;
        }
      }
      check('up');
      dirty.dirty('block');
      break;
    case 'ArrowDown':
      if (blockState) {
        blockState.height -= 1;
      }
      check('down');
      dirty.dirty('block');
      break;
    case 'ArrowLeft':
      if (blockState) {
        blockState.left -= 1;
      }
      check('left');
      dirty.dirty('block');
      break;
    case 'ArrowRight':
      if (blockState) {
        blockState.left += 1;
      }
      check('right');
      dirty.dirty('block');
      break;
    case ' ':
      // 暂停
      pause = !pause;
      break;
    case 'r':
      // 重新开始
      if (gameOver) {
        background = newBackground();
        blockState = newBlock();
        gameOver = false;
        score = 0;
      }
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

function check(action: string) {
  if (!blockState) {
    return;
  }
  let overed = false;
  let bb = getBlockBackground();
  if (!bb) {
    overed = true;
  } else {
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const c1 = background[i][j];
        const c2 = bb[i][j];
        if (c1 != 'n' && c2 != 'n') {
          overed = true;
          break;
        }
      }
    }
  }
  switch (action) {
    case 'up':
      if (overed) {
        blockState.dir -= 1;
        if (blockState.dir < 0) {
          blockState.dir = blockState.type.length - 1;
        }
      }
      break;
    case 'down':
      if (overed) {
        // 落地一行
        blockState.height += 1;
        bb = getBlockBackground();
        if (!bb) {
          console.error('invalid state: ', background, blockState);
          return;
        }
        for (let i = 0; i < height; i++) {
          for (let j = 0; j < width; j++) {
            const c = bb[i][j];
            if (c != 'n') {
              background[i][j] = c;
            }
          }
        }
        // game over
        if (blockState.height == height) {
          gameOver = true;
        }
        // 消行
        // todo:

        // 创建新块
        blockState = newBlock();
      }
      break;
    case 'left':
      if (overed) {
        blockState.left = 0;
      }
      break;
    case 'right':
      if (overed) {
        blockState.left -= 1;
      }
      break;
  }
}

function next() {
  if (!blockState) {
    return;
  }
  // 下降一格
  blockState.height -= 1;
  // 判断到底
  check('down');
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
  if (blink) {
    // 消行时，闪烁
    // todo:
    return;
  }
  const now = Number(new Date());
  if (now - timer_prev >= speed) {
    timer_prev = now;
    next();
    dirty.dirty('timer');
  }
}

// 边框
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

// 生成和背景相同的，代表当前块的数组
function getBlockBackground(): string[][] | false {
  const r: string[][] = newBackground();
  if (!blockState) {
    return r;
  }
  const b = blockState.type[blockState.dir];
  for (let cIdx = 0; cIdx < b.length; cIdx++) {
    const c = b[cIdx];
    for (let rIdx = 0; rIdx < c.length; rIdx++) {
      const color = c[rIdx];
      const x = blockState.left + cIdx;
      const y = blockState.height + rIdx;
      if (x < 0 || x >= width || y < 0) {
        return false;
      }
      if (y >= height) {
        continue;
      }
      r[y][x] = color;
    }
  }
  return r;
}

// 背景
function updateBackground(isBlue: boolean): Group {
  const g = new Two.Group();
  for (let i = 0; i < height; i++) {
    for (let j = 0; j < width; j++) {
      const c = background[i][j];
      let bdraw = false;
      switch (c) {
        case 'b':
          if (isBlue) {
            bdraw = true;
          }
          break;
        case 'r':
          if (!isBlue) {
            bdraw = true;
          }
          break;
      }
      if (bdraw) {
        const b = new Two.Rectangle(
          boxSize * (j + 1.5), 
          boxSize * (height - i + 0.5), 
          boxSize-2, boxSize-2);
        g.add(b);
      }
    }
  }
  return g;
}

// 闪烁，消行时
function updateBlink(isBlue: boolean): Group {
  const g = new Two.Group();
  return g;
}

// 当前的方块
function updateBlock(isBlue: boolean): Group {
  const g = new Two.Group();
  if (!blockState || blockState.height >= height) {
    return g;
  }
  const b = blockState.type[blockState.dir];
  for (let cIdx = 0; cIdx < b.length; cIdx++) {
    const c = b[cIdx];
    for (let rIdx = 0; rIdx < c.length; rIdx++) {
      const color = c[rIdx];
      let bdraw = false;
      switch (color) {
        case 'b':
          if (isBlue) {
            bdraw = true;
          }
          break;
        case 'r':
          if (!isBlue) {
            bdraw = true;
          }
          break;
      }
      const x = blockState.left + cIdx;
      const y = blockState.height + rIdx;
      if (x < 0 || x >= width || y < 0 || y >= height) {
        continue;
      }
      if (bdraw) {
        const b = new Two.Rectangle(
          boxSize * (x + 1.5), 
          boxSize * (height - y + 0.5), 
          boxSize-2, boxSize-2);
        g.add(b);
      }
    }
  }
  return g;
}

// 蓝色眼镜看到的
function updateBlue(): Group {
  const g = new Two.Group();
  g.add(updateBorder(true));
  g.add(updateBackground(true));
  g.add(updateBlink(true));
  g.add(updateBlock(true));
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
  g.add(updateBackground(false));
  g.add(updateBlink(false));
  g.add(updateBlock(false));
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
  // 
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

// 双眼都能看到的
function updateMessage(): Group {
  const g = new Two.Group();
  if (gameOver) {
    const t = new Two.Text('GAME OVER', two.width / 2, boxSize * height * scale / 4, { size: 30 });
    g.add(t);
  }
  const s = new Two.Text(`${score}`, two.width - 20, 50, { size: 20, alignment: 'right' });
  g.add(s);
  g.noStroke();
  if (bgTheme.value == 'dark') {
    g.fill = '#fff';
  } else {
    g.fill = '#000';
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

  // 双眼都能看到的
  const gm = updateMessage();
  
  two.clear();
  two.add(gb);
  two.add(gr);
  two.add(gi);
  two.add(gm);
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
