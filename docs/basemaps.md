# Basemap Configuration

## 环境变量

| 变量 | 说明 |
| --- | --- |
| VITE_TDT_TOKEN | 天地图访问令牌，默认使用示例值 |
| VITE_MAPBOX_TOKEN | Mapbox access token |
| VITE_GAODE_KEY | 高德地图 Web 服务 Key |
| VITE_TENCENT_KEY | 腾讯地图 Web 服务 Key |
| VITE_BAIDU_AK | 百度地图 AK |
| VITE_PROXY_TDT | 天地图代理前缀，默认 /td |
| VITE_PROXY_MAPBOX | Mapbox 代理前缀，默认 /mapbox |
| VITE_PROXY_GAODE | 高德代理前缀，默认 /gaode |
| VITE_PROXY_TENCENT | 腾讯代理前缀，默认 /tencent |
| VITE_PROXY_BAIDU | 百度代理前缀，默认 /baidu |
| VITE_DEFAULT_BASEMAP | 默认底图 ID，默认 	ianditu-imagery |

## 添加新的底图

在 src/services/basemaps/definitions.ts 中追加配置项：

`	s
{
  id: 'example-id',
  label: '显示名称',
  group: '分组',
  imagery: [
    {
      id: 'example-layer',
      create: async (ctx) => new ctx.Cesium.UrlTemplateImageryProvider({
        url: '...',
      }),
    },
  ],
  terrain: {
      id: 'terrain-id',
      create: async (ctx) => new ctx.Cesium.EllipsoidTerrainProvider(),
  },
}
`

完成后执行 
pm run test 以确保新增配置通过单元测试。
