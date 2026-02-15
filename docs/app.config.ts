/**
 * 앱 기본 설정
 */
import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'menu-today',
  web: {
    host: '0.0.0.0',
    port: 8081,
    commands: {
      dev: 'rsbuild dev',
      build: 'rsbuild build',
    },
  },
  permissions: [],
  outdir: 'dist',
  brand: {
    displayName: '오늘 메뉴 추천',
    icon: 'https://raw.githubusercontent.com/jino123413/app-logos/master/menu-today.png',
    primaryColor: '#F10803',
    bridgeColorMode: 'basic',
  },
  webViewProps: {
    type: 'partner',
  },
});
