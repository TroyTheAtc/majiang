# 老婆的麻将日记 — GitHub Pages 公网部署指南

当前版本：**1.6.4.1**（H5 稳定版，鸿蒙端开发以此版本为基线）

按下面步骤操作，即可获得一个免费公网地址（如 `https://TroyTheAtc.github.io/majiang/`），手机随时打开使用。

---

## 一、准备：需要上传的文件

部署到 GitHub Pages 时，以下文件会被访问，请确保都在项目里：

| 文件/目录 | 说明 |
|----------|------|
| `index.html` | 页面入口 |
| `src/css/style.css` | 样式 |
| `src/js/data.js`、`stats.js`、`view.js`、`add.js`、`list.js`、`divine.js`、`transfer.js`、`app.js` | 逻辑与数据（按模块拆分，需全部上传） |
| `assets/js/` | 脚本：`solarlunar.min.js`、`lunar.min.js`、`lz-string.min.js`、`qrcode.min.js`、`jsQR.min.js` 等 |
| `assets/images/` | 图片资源：背景图 `background.jpg`，以及 `bianji.png`、`shanchu.png`、`yanjing.png`、`eye-close.png`、等级图、箭头图等 |

其它文件（如 `docs/`、`README.md` 等）可一并提交，不影响网页运行。

---

## 二、注册 GitHub 并创建仓库

1. 打开 **https://github.com**，用邮箱注册并登录（若已有账号可跳过）。
2. 右上角 **「+」** → **「New repository」**。
3. 填写：
   - **Repository name**：例如 `majiang` 或 `laopo-majiang`（只能英文、数字、短横线）。
   - **Public**（公开）。
   - **不要**勾选 "Add a README file"（避免和本地冲突）。
4. 点击 **「Create repository」**，记下仓库地址。本仓库地址：`https://github.com/TroyTheAtc/majiang`。

---

## 三、在本地用 Git 提交并推送到 GitHub

在终端中进入项目目录，依次执行（**只复制下面每行命令，不要复制以 # 开头的说明行**）：

```bash
cd "/Users/troy/Desktop/个人材料/000-宝宝/MAJIANG"
git init
git add .
git commit -m "老婆的麻将日记 H5 初版"
git remote remove origin
git remote add origin https://github.com/TroyTheAtc/majiang.git
git branch -M main
git push -u origin main
```

若之前没添加过远程，可省略 `git remote remove origin`；若提示 `origin already exists`，先执行 `git remote remove origin` 再执行 `git remote add origin ...`。

若提示输入账号密码：GitHub 已不支持密码推送，请使用 **Personal Access Token**（在 GitHub → Settings → Developer settings → Personal access tokens 里生成，勾选 `repo` 权限），在密码处粘贴 Token。

---

## 四、开启 GitHub Pages

1. 打开你的 GitHub 仓库页面。
2. 上方菜单 **「Settings」**（设置）。
3. 左侧找到 **「Pages」**。
4. 在 **Build and deployment** 下：
   - **Source** 选 **Deploy from a branch**。
   - **Branch** 选 **main**，目录选 **/ (root)**。
   - 点击 **Save**。
5. 等待一两分钟，页面顶部会出现绿色提示：**Your site is live at https://TroyTheAtc.github.io/majiang/**。

---

## 五、获得公网地址

部署成功后，访问地址为：

- **https://TroyTheAtc.github.io/majiang/**

注意：末尾建议加 **`/`**，否则可能跳转异常。  
把该链接发给你老婆，手机浏览器打开即可；可添加到主屏幕当“应用”用。

---

## 六、以后更新页面怎么操作

改完本地文件后，复制下面整行到终端执行，即可让公网生效（约 1～2 分钟）：

```bash
cd "/Users/troy/Desktop/个人材料/000-宝宝/MAJIANG" && git add . && git commit -m "更新" && git push -u origin main
```

首次推送若提示 "no upstream branch"，用上面这条即可（`-u origin main` 会绑定远程分支）；之后也可直接 `git push`。

若想写具体更新说明，把 `-m "更新"` 改成例如 `-m "优化背景图加载"` 即可。推送完成后，GitHub Pages 会自动重新部署。

**让手机端马上看到新版本**：推送后若手机仍显示旧版，是浏览器缓存。在项目里全局搜索 `?v=1.6.4.1` 全部替换为 `?v=1.6.4.2`，再执行上面命令推送一次，手机刷新后就会拉新文件。

---

## 七、常见问题

- **页面打开是 404**：确认 Settings → Pages 里 Source 已选 "Deploy from a branch"，分支为 main，目录为 / (root)。
- **样式/图片不显示**：确认 `index.html`、`src/css/style.css`、`src/js/` 下全部 JS 文件及 `assets/images/` 下所需图片都已提交并推送。
- **国内访问慢或打不开**：GitHub 服务器在海外，国内网络可能较慢或偶发无法访问，可多试几次或换网络；若长期需国内访问可考虑腾讯云等方案。
- **数据会丢吗**：不会。数据存在浏览器 localStorage 里，和访问的网址绑定；只要用同一个链接、同一台设备，数据会保留。

---

## 八、黄历（占卜宜忌）

占卜页的「宜/忌」使用 [lunar-javascript](https://github.com/6tail/lunar-javascript) 按公历日期计算**建除十二值日**（月支起建），再根据自建规则得出宜忌与等级，无需联网、无 API key。若该库未加载则自动回退到内置黄历表。

完成以上步骤后，H5 即通过 GitHub Pages 上公网，免费使用。
