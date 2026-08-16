import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Có một yarn.lock nằm ở thư mục home của máy này, khiến Next.js suy ra nhầm
  // thư mục gốc của workspace và gói nhầm tệp khi build. Chỉ rõ gốc là thư mục
  // dự án để build ở máy và trên Vercel cho ra cùng một kết quả.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
