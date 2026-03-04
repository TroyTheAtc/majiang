# 老婆的麻将日记 — GitHub Pages 公网部署指南

按下面步骤操作，即可获得一个免费公网地址（如 `https://TroyTheAtc.github.io/majiang/`），手机随时打开使用。

---

## 一、准备：需要上传的文件

部署到 GitHub Pages 时，以下文件会被访问，请确保都在项目里：

| 文件 | 说明 |
|------|------|
| `index.html` | 页面结构 |
| `style.css` | 样式 |
| `app.js` | 逻辑与数据 |
| `c6f419bb9e8f31278b934d0f75ef9ba2.png` | 背景图 |

其它文件（如 `start.sh`、`README.md` 等）可一并提交，不影响网页运行。

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

在终端中进入项目目录，依次执行：

```bash
cd "/Users/troy/Desktop/个人材料/000-宝宝/MAJIANG"

# 1. 初始化仓库（若已初始化可跳过）
git init

# 2. 添加所有文件
git add .

# 3. 第一次提交
git commit -m "老婆的麻将日记 H5 初版"

# 4. 添加 GitHub 远程仓库
git remote add origin https://github.com/TroyTheAtc/majiang.git

# 5. 推送到 GitHub（主分支名为 main）
git branch -M main
git push -u origin main
```

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

改完本地文件后，在项目目录执行：

```bash
cd "/Users/troy/Desktop/个人材料/000-宝宝/MAJIANG"
git add .
git commit -m "更新说明（随便写）"
git push
```

推送完成后，GitHub Pages 会自动重新部署，一般 1～2 分钟内生效。

---

## 七、常见问题

- **页面打开是 404**：确认 Settings → Pages 里 Source 已选 "Deploy from a branch"，分支为 main，目录为 / (root)。
- **样式/图片不显示**：确认 `style.css`、`app.js` 和 `c6f419bb9e8f31278b934d0f75ef9ba2.png` 都已提交并推送。
- **国内访问慢或打不开**：GitHub 服务器在海外，国内网络可能较慢或偶发无法访问，可多试几次或换网络；若长期需国内访问可考虑腾讯云等方案。
- **数据会丢吗**：不会。数据存在浏览器 localStorage 里，和访问的网址绑定；只要用同一个链接、同一台设备，数据会保留。

完成以上步骤后，H5 即通过 GitHub Pages 上公网，免费使用。
