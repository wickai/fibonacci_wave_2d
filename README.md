# Fibonacci–Lucas Mod Cycles Visualizer

![斐波那契数列模300的前30序列](figs/mod300_fib_30seqs.png)


本项目用于研究 **Fibonacci–Lucas 数列在模 $m$ 下的循环性质**，并通过交互式可视化直观展示。  
不同的模数 $m$ 会生成若干 **不相同的循环（cycles）**，每个循环可表示为一条有限的数列。  
在前端界面中，用户可以选择模数、切换展示模式，并在二维表格中观察这些循环对应的坐标分布。

## 背景简介

Fibonacci 数列在模 $m$ 下会表现出**纯周期性**，其基本周期称为 **Pisano period**。  
更一般地，所有初始值 $(a,b)$ 在模 $m$ 下都会对应一条唯一的循环。  
这些循环可以形式化为有向图 $G(m)$ 中的环，对应你的研究问题：**在不同进制（模数）下枚举所有非重复循环，并可视化它们的结构与分布。**

可视化方式：  
- 每个循环分配一种颜色；  
- 循环内相邻数值 $(x_i, x_{i+1})$ 作为表格坐标着色；  
- 用户可通过按钮切换某些循环的显示；  
- 支持坐标文字显示/隐藏、hover 提示坐标、排序与筛选。

---

## 相关文献

- Wikipedia: [Pisano period](https://en.wikipedia.org/wiki/Pisano_period) — 介绍 皮萨诺周期（记作 π(n)）。 
- [SYMMETRIES OF FIBONACCI POINTS, MOD m](https://webspace.ship.edu/msrenault/fibonacci/Renault%20-%20Symmetries%20of%20Fibonacci%20Points%20Mod%20m.pdf) -- 观察到fibonacci数列在模 $m$ 下的周期性。
- Marc Renault. [*The Period, Rank, and Order of the (a,b)-Fibonacci Sequence Mod m*](https://webspace.ship.edu/msrenault/fibonacci/RenaultPeriodRankOrderMathMag.pdf). *Math. Magazine* (2013).   -- 扩展(a,b)-Fibonacci的周期性
- [The Fibonacci Sequence Modulo m](https://webspace.ship.edu/msrenault/fibonacci/fib.htm)
- [FIBONACCI RANDOM GENERATOR AND FOURIER ANALYSIS](https://surim.stanford.edu/sites/g/files/sbiybj26191/files/media/file/fibonacci_random_generator_and_fourier_analysis_0.pdf) gpt-5 researched paper

1. 斐波那契数列科普

- [OI Wiki: 斐波那契数列性质](https://oi-wiki.org/math/combinatorics/fibonacci/)  
  简介：详细介绍斐波那契数列的定义、性质及相关组合数学应用。

- [OEIS: A000045 斐波那契数列](https://oeis.org/A000045)  
  简介：OEIS（在线整数序列百科）中的斐波那契数列记录，包含前若干项、公式及参考文献。
  
2. 准晶体与相关铺砖

- [罗杰·彭洛斯 (Roger Penrose)](https://zh.wikipedia.org/wiki/%E7%BE%85%E5%82%91%C2%B7%E6%BD%98%E6%B4%9B%E6%96%AF)  
  简介：英国数学家，提出了 **彭洛斯铺砖（Penrose tiling）** 的概念，首次实现非周期性的五重对称结构。

- [彭罗斯密铺 (Penrose tiling)](https://zh.wikipedia.org/wiki/%E5%BD%AD%E7%BE%85%E6%96%AF%E5%AF%86%E9%8B%AA)  
  简介：一种非周期性铺砖方法，能产生五重对称图案，与准晶体结构相关。

- [王氏砖](https://zh.wikipedia.org/wiki/%E7%8E%8B%E6%B0%8F%E7%A0%96)  
  简介：中国数学家王教授提出的一种准周期铺砖方法，与彭罗斯铺砖类似，可产生复杂的非重复图案。
---

## 启动说明

### 后端（FastAPI）
1. 进入后端目录：
   ```bash
   cd backend
````

2. 安装依赖：

   ```bash
   pip install fastapi uvicorn pydantic python-multipart
   ```
3. 启动服务：

   ```bash
   uvicorn main:app --reload --port 8000
   ```

   后端默认运行在 [http://localhost:8000](http://localhost:8000)。

---

### 前端（React + Vite + TypeScript）

1. 创建并进入前端目录：

   ```bash
   npm create vite@latest frontend -- --template react-ts
   cd frontend
   npm install
   ```
2. 将 `src/App.tsx`、`src/types.ts`、`src/styles.css` 替换为本项目提供的版本。
3. 启动开发服务器：

   ```bash
   npm run dev
   ```
4. 打开 [http://localhost:5173](http://localhost:5173) 即可访问可视化界面。

---

## 功能特性

* 支持输入任意模数 \$m\$，枚举所有不重复循环。
* 左侧显示循环按钮，可点击切换显示。
* 支持循环排序（原始顺序 / 按长度）。
* 网格显示循环对应的坐标分布，颜色区分不同循环。
* 悬停显示坐标浮窗 + 高亮描边。
* 可切换是否显示网格上的坐标文字。
* 支持清空所有选择。

---

## TODO / 扩展

* 支持导出循环数据为 CSV/JSON。
* 增加统计面板（循环长度分布直方图、剩余类分布）。
* 支持 Lucas 序列和一般 \$(a,b)\$-Fibonacci 的可视化。
