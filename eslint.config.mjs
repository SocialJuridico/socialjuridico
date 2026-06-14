import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    files: [
      "src/app/dashboard/advogado/smartdoc/components/SmartDocDashboard.jsx",
    ],
    rules: {
      // O componente limpa explicitamente o valor do input nativo para permitir
      // que o mesmo arquivo seja selecionado novamente após a remoção.
      "react-hooks/immutability": "off",
      // As dependências usadas pelo modal são declaradas individualmente; incluir
      // o objeto controller inteiro recriaria o listener a cada renderização.
      "react-hooks/exhaustive-deps": "off",
    },
  },
  {
    files: [
      "src/app/dashboard/advogado/notificacaoextrajudicial/components/ExtrajudicialNotificationDashboard.jsx",
    ],
    rules: {
      // O controlador entrega a referência do input nativo junto das ações do
      // modal. A referência só é lida dentro de handlers para abrir ou limpar o
      // seletor de arquivos, nunca para calcular a interface renderizada.
      "react-hooks/refs": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
