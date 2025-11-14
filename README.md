# IGV.js 一键部署工具

🧬 在服务器上快速部署 IGV.js 基因组浏览器，无需 root 权限！

## 功能特点

- ✅ **无需 root 权限** - 用户级部署，适合普通服务器用户
- 🚀 **一键部署** - 简单的部署脚本，自动完成所有配置
- 📁 **文件浏览** - Web 界面直接浏览用户目录中的基因组文件
- 🔍 **多格式支持** - 支持 BAM、VCF、BED、GFF、BigWig 等常见格式
- 🌐 **基于浏览器** - 无需安装桌面软件，浏览器即可查看
- 🔒 **安全可靠** - 文件访问限制在指定目录，支持 Range 请求

## 支持的文件格式

| 格式 | 说明 | 索引文件 |
|------|------|---------|
| BAM | 比对数据 | .bai |
| CRAM | 压缩比对数据 | .crai |
| VCF | 变异数据 | .tbi (压缩时) |
| BED | 区域注释 | - |
| GFF/GTF | 基因注释 | - |
| BigWig | 覆盖度数据 | - |
| FASTA | 参考基因组 | .fai |

## 快速开始

### 前置要求

- Node.js (v14 或更高版本)
- npm (通常随 Node.js 安装)

**没有 Node.js？** 使用 nvm 安装（无需 root）：

```bash
# 安装 nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 加载 nvm
source ~/.bashrc

# 安装 Node.js
nvm install --lts
```

### 一键部署

```bash
# 1. 克隆或下载项目
git clone <your-repo-url>
cd IGV_view

# 2. 运行部署脚本
./deploy.sh

# 3. 启动服务器
./start.sh
```

就这么简单！🎉

### 访问界面

部署完成后，在浏览器中打开：

```
http://localhost:8080
```

如果在远程服务器上部署，可以使用 SSH 端口转发：

```bash
# 在本地机器上运行
ssh -L 8080:localhost:8080 user@remote-server
```

然后在本地浏览器访问 `http://localhost:8080`

## 使用说明

### 1. 准备数据文件

将基因组数据文件放入数据目录（默认：`~/igv_data`）：

```bash
# 示例目录结构
~/igv_data/
├── genomes/
│   ├── hg38.fa
│   └── hg38.fa.fai
├── tracks/
│   ├── sample1.bam
│   ├── sample1.bam.bai
│   ├── variants.vcf.gz
│   └── variants.vcf.gz.tbi
└── annotations/
    ├── genes.gff3
    └── repeats.bed
```

### 2. 启动服务器

```bash
./start.sh
```

### 3. 在 Web 界面中操作

1. **选择参考基因组**：从下拉菜单选择（hg38、hg19、mm10 等）
2. **刷新文件列表**：点击"刷新文件列表"按钮
3. **加载轨道**：点击文件，然后点击"添加所选轨道"
4. **浏览基因组**：
   - 拖动查看不同区域
   - 滚轮缩放
   - 在搜索框输入基因名或位置

### 4. 停止服务器

```bash
./stop.sh
```

## 配置选项

编辑 `config.js` 自定义配置：

```javascript
module.exports = {
  // 服务器端口
  port: 8080,

  // 数据目录路径
  dataDir: process.env.HOME + '/igv_data',

  // 允许的文件扩展名
  allowedExtensions: ['.bam', '.vcf', '.bed', ...],

  // IGV.js 版本
  igvVersion: '2.15.11'
};
```

### 环境变量

可以通过环境变量覆盖默认配置：

```bash
# 自定义端口
PORT=9090 ./start.sh

# 自定义数据目录
DATA_DIR=/path/to/data ./start.sh
```

## 项目结构

```
IGV_view/
├── deploy.sh          # 一键部署脚本
├── start.sh           # 启动脚本
├── stop.sh            # 停止脚本
├── config.js          # 配置文件
├── server.js          # Express 服务器
├── package.json       # Node.js 依赖
├── public/            # 前端文件
│   ├── index.html     # 主页面
│   └── app.js         # 前端逻辑
└── README.md          # 本文档
```

## API 接口

服务器提供以下 API 接口：

### GET /api/files
获取所有可用文件列表

**响应示例：**
```json
{
  "dataDir": "/home/user/igv_data",
  "files": [
    {
      "name": "sample.bam",
      "path": "tracks/sample.bam",
      "type": "file",
      "size": 1024000,
      "modified": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### GET /api/browse?path=<subpath>
浏览指定目录

### GET /data/<filepath>
下载或访问数据文件（支持 Range 请求）

### GET /api/health
健康检查

## 常见问题

### Q: 端口 8080 已被占用怎么办？

A: 修改 `config.js` 中的端口号，或使用环境变量：
```bash
PORT=9090 ./start.sh
```

### Q: 文件加载失败？

A: 检查以下几点：
1. 文件是否在数据目录中
2. 文件扩展名是否在允许列表中
3. BAM/VCF 等文件是否有对应的索引文件
4. 浏览器控制台是否有错误信息

### Q: 如何在后台运行服务器？

A: 使用 nohup 或 screen：
```bash
# 方法 1: nohup
nohup ./start.sh > server.log 2>&1 &

# 方法 2: screen
screen -S igv
./start.sh
# 按 Ctrl+A 然后 D 退出 screen
```

### Q: 如何限制访问？

A: 可以配置防火墙规则，或使用反向代理（如 nginx）添加认证。

### Q: 支持哪些参考基因组？

A: 支持 IGV.js 内置的所有基因组：
- 人类：hg38, hg19
- 小鼠：mm10, mm39
- 其他：可以加载自定义 FASTA 文件

## 性能优化

### 大文件处理

对于大型 BAM/CRAM 文件：
1. 确保有索引文件（.bai/.crai）
2. 使用压缩格式
3. 考虑使用 CRAM 代替 BAM（更小）

### 服务器优化

```javascript
// server.js 中可以添加缓存头
res.setHeader('Cache-Control', 'public, max-age=3600');
```

## 安全建议

1. **不要暴露敏感数据** - 仅将需要查看的文件放入数据目录
2. **使用防火墙** - 限制服务器端口访问
3. **定期更新** - 保持 Node.js 和依赖包更新
4. **使用 HTTPS** - 生产环境建议使用反向代理配置 HTTPS

## 故障排查

### 查看服务器日志

```bash
# 如果使用 nohup 启动
tail -f server.log

# 实时查看
./start.sh  # 直接运行，查看控制台输出
```

### 常见错误

**Error: EADDRINUSE** - 端口已被占用
```bash
# 查找占用端口的进程
lsof -i:8080
# 或更改端口
PORT=9090 ./start.sh
```

**Error: EACCES** - 权限不足
```bash
# 检查数据目录权限
ls -la ~/igv_data
# 修改权限
chmod -R 755 ~/igv_data
```

## 贡献

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 相关链接

- [IGV.js 官方文档](https://github.com/igvteam/igv.js)
- [IGV.js Wiki](https://github.com/igvteam/igv.js/wiki)
- [Node.js 官网](https://nodejs.org/)

## 更新日志

### v1.0.0 (2024-01-01)
- 首次发布
- 支持基本的文件浏览和轨道加载
- 一键部署脚本
- 支持常见基因组文件格式

---

如有问题或建议，请提交 Issue！🎉
