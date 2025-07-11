// Importa o necessário para "conversar" com a Base dos Dados
import { readSql } from '@basedosdados/sdk-js';

export default async function handler(req, res) {
  // Pega a sigla do estado que o seu app vai mandar na URL (ex: ?uf=MG)
  const { uf } = req.query;

  // Se o seu app não mandar a UF, retorna um erro.
  if (!uf) {
    return res.status(400).json({ success: false, message: 'O parâmetro UF é obrigatório.' });
  }

  // Este é o "pedido" em SQL que fazemos para a Base dos Dados
  const query = `
    SELECT
      AVG(preco_venda) as precoMedio
    FROM \`basedosdados.br_anp_precos_combustiveis.microdados\`
    WHERE sigla_uf = '${uf.toUpperCase()}'
    AND data_coleta > DATE_SUB(CURRENT_DATE(), INTERVAL 21 DAY) -- Dados das últimas 3 semanas
    AND produto = 'GASOLINA'
  `;

  try {
    // Tenta executar o pedido
    // O SDK usa as credenciais que vamos configurar na Vercel depois
    const data = await readSql(query);
    const precoMedio = data[0]?.precoMedio; // Pega o resultado do pedido

    if (!precoMedio) {
      return res.status(404).json({
        success: false,
        message: `Não foram encontrados dados recentes de Gasolina para a UF: ${uf.toUpperCase()}`
      });
    }

    // Se deu tudo certo, responde com o preço
    res.status(200).json({
      success: true,
      data: {
        uf: uf.toUpperCase(),
        precoMedio: parseFloat(precoMedio.toFixed(2)),
        fonte: 'ANP (via Base dos Dados)',
        ultimaVerificacao: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error(error);
    // Se deu algum erro na comunicação, avisa
    res.status(500).json({ success: false, message: 'Erro ao conectar com a fonte de dados (Base dos Dados).' });
  }
}
