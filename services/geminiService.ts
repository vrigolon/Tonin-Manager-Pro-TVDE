import { GoogleGenAI } from "@google/genai";
import { CalculatedReport } from "../types";
import { formatCurrency } from "../constants";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found in environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const analyzeFinancialReport = async (report: CalculatedReport): Promise<string> => {
  const client = getClient();
  if (!client) return "Erro: Chave de API não configurada. Por favor, verifique as configurações.";

  const prompt = `
    Atue como um gestor financeiro experiente para uma frota de TVDE (Uber/Bolt) em Portugal.
    Analise o seguinte relatório semanal de um motorista:

    Motorista: ${report.driverName}
    Veículo: ${report.vehicleModel} (${report.vehiclePlate})
    Semana de: ${report.weekStartDate}

    DADOS FINANCEIROS:
    - Faturação Uber: ${formatCurrency(report.uberGrossEarnings)}
    - Faturação Bolt: ${formatCurrency(report.boltGrossEarnings || 0)}
    - Total Faturação: ${formatCurrency(report.totalGrossEarnings)}
    
    DESPESAS:
    - Custo Aluguer Viatura: ${formatCurrency(report.rentCost)}
    - Custos Combustível/Energia: ${formatCurrency(report.fuelCost)}
    - Portagens (Via Verde): ${formatCurrency(report.tollsCost)}
    - Pagamento Dívidas: ${formatCurrency(report.debtPayment)}
    - Outros: ${formatCurrency(report.miscExpenses)}
    
    LUCRO LÍQUIDO FINAL: ${formatCurrency(report.netEarnings)}

    Por favor, forneça uma análise concisa (máximo 3 parágrafos):
    1. O lucro é saudável considerando a média do mercado português?
    2. A relação Faturação/Custos está eficiente?
    3. Sugestão prática para melhorar a rentabilidade na próxima semana.
    
    Responda em Português de Portugal. Use formatação Markdown.
  `;

  try {
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || "Não foi possível gerar uma análise no momento.";
  } catch (error) {
    console.error("Error analyzing report:", error);
    return "Ocorreu um erro ao contactar a IA. Tente novamente mais tarde.";
  }
};