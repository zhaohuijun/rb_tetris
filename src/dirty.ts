export class Dirty {
  private value: Map<string, boolean>;
  private dirtyCount: number;

  constructor() {
    this.value = new Map();
    this.dirtyCount = 0;
  }

  _count() {
    // 计算dirty数据的个数
    let c = 0;
    for (const [k, v] of this.value) {
      if (v) {
        c += 1;
      }
    }
    this.dirtyCount = c;
  }

  /**
   * 设置脏数据（需要重绘）
   * @param name 需要重绘的数据, 空字符串表示全部重绘
   */
  dirty(name?: string) {
    if (name) {
      this.value.set(name, true);
    } else {
      // 不设置的属性是dirty的
      this.value.clear();
    }
    this._count();
  }

  /**
   * 检查是否需要重绘
   * @param name 要检查的数据
   * @returns
   */
  check(name?: string): boolean {
    if (!name) {
      // 没有name，检查是否有需要更新的
      return this.value.size == 0 || this.dirtyCount > 0;
    }
    const v = this.value.get(name);
    if (v === false) {
      return false;
    }
    // 没有定义也算true
    return true;
  }

  /**
   * 清除dirty标志
   * @param name 要处理的数据
   */
  clean(name?: string) {
    if (!name) {
      for (const [k] of this.value) {
        this.value.set(k, false);
      }
    } else {
      this.value.set(name, false);
    }
    this._count();
  }

  /**
   * 返回所有的key
   */
  allKeys(): string[] {
    const r: string[] = [];
    for (const [k] of this.value) {
      r.push(k);
    }
    return r;
  }

  debugString(): string {
    let s = 'c:' + this.dirtyCount + ',';
    for (const [k, v] of this.value) {
      s += `${k}:${v},`;
    }
    return s;
  }
}
