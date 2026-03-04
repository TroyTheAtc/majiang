# 老婆的麻将日记 — Gitee Pages 公网部署指南

按下面步骤操作，即可获得一个在国内也能快速访问的公网地址（如 `https://你的用户名.gitee.io/majiang/`）。

---

## 一、准备：需要上传的文件

部署到 Gitee Pages 时，以下文件会被访问，请确保都在项目里：

| 文件 | 说明 |
|------|------|
| `index.html` | 页面结构 |
| `style.css` | 样式 |
| `app.js` | 逻辑与数据 |
| `c6f419bb9e8f31278b934d0f75ef9ba2.png` | 背景图 |

其它文件（如 `start.sh`、`README.md` 等）可一并提交，不影响网页运行。

---

## 二、注册 Gitee 并创建仓库

1. 打开 **https://gitee.com**，用手机或邮箱注册并登录。
2. 右上角 **「+」** → **「新建仓库」**。
3. 填写：
   - **仓库名称**：例如 `majiang` 或 `laopo-majiang`（只能英文、数字、短横线）。
   - **路径**：会随仓库名自动生成，也可自定义。
   - **是否开源**：选 **公开**（Gitee Pages 免费版一般要求公开仓库）。
   - **不要**勾选「使用 Readme 文件初始化仓库」（避免和本地冲突）。
4. 点击 **「创建」**，记下仓库地址，形如：`https://gitee.com/你的用户名/majiang`。

---

## 三、在本地用 Git 提交并推送到 Gitee

在终端中进入项目目录，依次执行（把 `你的用户名` 和 `majiang` 换成你的实际信息）：

```bash
cd "/Users/troy/Desktop/个人材料/000-宝宝/MAJIANG"

# 1. 初始化仓库（若已初始化可跳过）
git init

# 2. 添加所有文件
git add .

# 3. 第一次提交
git commit -m "老婆的麻将日记 H5 初版"

# 4. 添加 Gitee 远程仓库（替换成你的仓库地址）
git remote add origin https://gitee.com/你的用户名/majiang.git

# 5. 推送到 Gitee（主分支名多为 main 或 master，按 Gitee 仓库页提示为准）
git branch -M main
git push -u origin main
```

若 Gitee 提示输入账号密码：用户名填你的 Gitee 用户名，密码可使用 **私人令牌**（在 Gitee 设置 → 安全设置 → 私人令牌 里生成）。

---

## 四、开启 Gitee Pages

1. 打开你的 Gitee 仓库页面。
2. 上方菜单 **「服务」** → **「Gitee Pages」**。
3. 若首次使用，按提示 **「启动」** 或 **「开通」** Gitee Pages。
4. **部署分支** 选 `main`（或你推送的分支），**部署目录** 留空（表示根目录）。
5. 点击 **「启动」** 或 **「更新」**，等待一两分钟。

---

## 五、获得公网地址

部署成功后，在 Gitee Pages 页面会显示访问地址，一般为：

- **https://你的用户名.gitee.io/majiang/**

注意：末尾要有 **`/`**，否则可能打不开。  
把该链接发给你老婆，手机浏览器打开即可使用；可添加到主屏幕当“应用”用。

---

## 六、以后更新页面怎么操作

改完本地文件后，在项目目录执行：

```bash
cd "/Users/troy/Desktop/个人材料/000-宝宝/MAJIANG"
git add .
git commit -m "更新说明（随便写）"
git push
```

推送完成后，到 Gitee 仓库 → **服务** → **Gitee Pages** → 点 **「更新」**，等片刻即可看到新版本（有时会自动更新，无需点）。

---

## 七、常见问题

- **页面打开是 404**：确认 Gitee Pages 已启动，且访问地址末尾带 `/`。
- **样式/图片不显示**：确认 `style.css`、`app.js` 和 `c6f419bb9e8f31278b934d0f75ef9ba2.png` 都已提交并推送。
- **数据会丢吗**：不会。数据存在浏览器 localStorage 里，和访问的网址绑定；只要用同一个链接、同一台设备，数据会保留（清空浏览器该站数据则会清空记录）。

完成以上步骤后，H5 就已按 Gitee Pages 方案上公网，在国内也可方便访问。
