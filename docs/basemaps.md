# Basemap Configuration

## ��������

| ���� | ˵�� |
| --- | --- |
| VITE_TDT_TOKEN | ���ͼ�������ƣ�Ĭ��ʹ��ʾ��ֵ |
| VITE_MAPBOX_TOKEN | Mapbox access token |
| VITE_GAODE_KEY | �ߵµ�ͼ Web ���� Key |
| VITE_TENCENT_KEY | ��Ѷ��ͼ Web ���� Key |
| VITE_BAIDU_AK | �ٶȵ�ͼ AK |
| VITE_PROXY_TDT | ���ͼ����ǰ׺��Ĭ�� /td |
| VITE_PROXY_MAPBOX | Mapbox ����ǰ׺��Ĭ�� /mapbox |
| VITE_PROXY_GAODE | �ߵ´���ǰ׺��Ĭ�� /gaode |
| VITE_PROXY_TENCENT | ��Ѷ����ǰ׺��Ĭ�� /tencent |
| VITE_PROXY_BAIDU | �ٶȴ���ǰ׺��Ĭ�� /baidu |
| VITE_DEFAULT_BASEMAP | Ĭ�ϵ�ͼ ID��Ĭ�� 	ianditu-imagery |

## ����µĵ�ͼ

�� src/services/basemaps/definitions.ts ��׷�������

`	s
{
  id: 'example-id',
  label: '��ʾ����',
  group: '����',
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

��ɺ�ִ�� 
pm run test ��ȷ����������ͨ����Ԫ���ԡ�
