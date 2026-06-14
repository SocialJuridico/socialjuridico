"use client";

import {
  AlertTriangle,
  Calculator,
  ChevronRight,
  Clock,
  FileText,
  Gavel,
  Loader2,
  RefreshCw,
  Scale,
  Shield,
} from "lucide-react";

import LawyerDashboardShell from "../../components/LawyerDashboardShell";
import { CALCULATOR_GROUPS, useLegalCalculator } from "../useLegalCalculator";
import styles from "../Calculator.module.css";

function Field({ label, children, hint }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

function NumberInput({ controller, name, placeholder }) {
  return (
    <input
      type="number"
      step="0.01"
      value={controller.inputs[name]}
      onChange={(event) => controller.updateInput(name, event.target.value)}
      placeholder={placeholder}
    />
  );
}

function DateInput({ controller, name }) {
  return (
    <input
      type="date"
      value={controller.inputs[name]}
      onChange={(event) => controller.updateInput(name, event.target.value)}
    />
  );
}

function SelectInput({ controller, name, options }) {
  return (
    <select
      value={controller.inputs[name]}
      onChange={(event) => controller.updateInput(name, event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function calculatorIcon(id) {
  if (["rescisao", "ferias", "hextras"].includes(id)) return Clock;
  if (["correcao", "juros", "selic", "art523"].includes(id)) return Scale;
  if (["cpc", "honorarios"].includes(id)) return Gavel;
  if (id === "prev") return Shield;
  return Calculator;
}

function CalculatorFields({ controller }) {
  const active = controller.activeCalculator;

  if (active === "rescisao") {
    return (
      <>
        <Field label="Salário base">
          <NumberInput controller={controller} name="salarioBase" placeholder="Ex: 5000" />
        </Field>
        <Field label="Média de variáveis">
          <NumberInput controller={controller} name="teveComissoes" placeholder="Comissões, adicionais habituais" />
        </Field>
        <Field label="Data de admissão">
          <DateInput controller={controller} name="dataAdmissao" />
        </Field>
        <Field label="Data de rescisão">
          <DateInput controller={controller} name="dataRescisao" />
        </Field>
        <Field label="Modalidade">
          <SelectInput
            controller={controller}
            name="modalidadeRescisao"
            options={[
              { value: "sem_justa_causa", label: "Sem justa causa" },
              { value: "acordo", label: "Acordo art. 484-A" },
              { value: "pedido_demissao", label: "Pedido de demissão" },
              { value: "justa_causa", label: "Justa causa" },
            ]}
          />
        </Field>
        <Field label="Férias vencidas">
          <NumberInput controller={controller} name="feriasVencidas" placeholder="0, 1, 2..." />
        </Field>
        <Field label="Saldo FGTS depositado" hint="Opcional. Se vazio, o sistema estima 8% por mês.">
          <NumberInput controller={controller} name="fgtsDepositado" placeholder="Opcional" />
        </Field>
        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={controller.inputs.temAviso}
            onChange={(event) => controller.updateInput("temAviso", event.target.checked)}
          />
          <span>Incluir aviso prévio indenizado proporcional</span>
        </label>
      </>
    );
  }

  if (active === "ferias") {
    return (
      <>
        <Field label="Salário base">
          <NumberInput controller={controller} name="salarioBase" />
        </Field>
        <Field label="Média de variáveis">
          <NumberInput controller={controller} name="teveComissoes" placeholder="Opcional" />
        </Field>
        <Field label="Dias de férias">
          <NumberInput controller={controller} name="diasFeria" />
        </Field>
        <Field label="Dias de abono pecuniário">
          <NumberInput controller={controller} name="abonoDias" />
        </Field>
        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={controller.inputs.incluirTerco}
            onChange={(event) => controller.updateInput("incluirTerco", event.target.checked)}
          />
          <span>Incluir 1/3 constitucional</span>
        </label>
      </>
    );
  }

  if (active === "hextras") {
    return (
      <>
        <Field label="Salário base">
          <NumberInput controller={controller} name="salarioBase" />
        </Field>
        <Field label="Divisor mensal">
          <NumberInput controller={controller} name="divisorHoras" placeholder="220" />
        </Field>
        <Field label="Horas extras no mês">
          <NumberInput controller={controller} name="horasExtrasMes" />
        </Field>
        <Field label="Adicional">
          <SelectInput
            controller={controller}
            name="adicional"
            options={[
              { value: "50", label: "50%" },
              { value: "60", label: "60%" },
              { value: "75", label: "75%" },
              { value: "100", label: "100%" },
            ]}
          />
        </Field>
        <Field label="DSR/reflexo informado (%)">
          <NumberInput controller={controller} name="dsrPercentual" placeholder="Ex: 16.67" />
        </Field>
      </>
    );
  }

  if (active === "correcao" || active === "selic") {
    return (
      <>
        <Field label={active === "selic" ? "Valor do débito" : "Valor original"}>
          <NumberInput controller={controller} name="valorOriginal" />
        </Field>
        {active === "correcao" && (
          <Field label="Índice">
            <SelectInput
              controller={controller}
              name="indice"
              options={[
                { value: "IPCA", label: "IPCA" },
                { value: "TR", label: "TR" },
                { value: "SELIC", label: "SELIC" },
                { value: "CDI", label: "CDI" },
              ]}
            />
          </Field>
        )}
        <Field label="Data inicial">
          <DateInput controller={controller} name="dataInicial" />
        </Field>
        <Field label="Data final">
          <DateInput controller={controller} name="dataFinal" />
        </Field>
      </>
    );
  }

  if (active === "juros") {
    return (
      <>
        <Field label="Valor devido">
          <NumberInput controller={controller} name="valorDevido" />
        </Field>
        <Field label="Vencimento">
          <DateInput controller={controller} name="dataVencimento" />
        </Field>
        <Field label="Pagamento/cálculo">
          <DateInput controller={controller} name="dataPagamento" />
        </Field>
        <Field label="Juros mensais (%)">
          <NumberInput controller={controller} name="taxaJurosMensal" />
        </Field>
      </>
    );
  }

  if (active === "cpc") {
    return (
      <>
        <Field label="Data do evento/intimação">
          <DateInput controller={controller} name="dataInicial" />
        </Field>
        <Field label="Tipo de prazo">
          <SelectInput
            controller={controller}
            name="tipoPrazo"
            options={[
              { value: "Recurso", label: "Recurso - 15 dias úteis" },
              { value: "Contestação", label: "Contestação - 15 dias úteis" },
              { value: "Embargos", label: "Embargos - 5 dias úteis" },
              { value: "Manifestação", label: "Manifestação - 5 dias úteis" },
            ]}
          />
        </Field>
      </>
    );
  }

  if (active === "honorarios") {
    return (
      <>
        <Field label="Valor da causa/proveito">
          <NumberInput controller={controller} name="causaValor" />
        </Field>
        <Field label="Complexidade">
          <SelectInput
            controller={controller}
            name="complexidade"
            options={[
              { value: "Baixa", label: "Baixa" },
              { value: "Média", label: "Média" },
              { value: "Alta", label: "Alta" },
            ]}
          />
        </Field>
        <Field label="Percentual manual (%)" hint="Opcional. Se vazio, usa 10%, 15% ou 20%.">
          <NumberInput controller={controller} name="percentualHonorarios" />
        </Field>
      </>
    );
  }

  if (active === "pensao") {
    return (
      <>
        <Field label="Renda líquida mensal">
          <NumberInput controller={controller} name="rendaMensal" />
        </Field>
        <Field label="Número de filhos/dependentes">
          <NumberInput controller={controller} name="numeroFilhos" />
        </Field>
        <Field label="Percentual sugerido (%)">
          <NumberInput controller={controller} name="percentualAlimentista" />
        </Field>
      </>
    );
  }

  if (active === "prev") {
    return (
      <>
        <Field label="Data de nascimento">
          <DateInput controller={controller} name="dataNascimento" />
        </Field>
        <Field label="Início das contribuições">
          <DateInput controller={controller} name="dataInicio" />
        </Field>
        <Field label="Sexo">
          <SelectInput
            controller={controller}
            name="sexo"
            options={[
              { value: "M", label: "Masculino" },
              { value: "F", label: "Feminino" },
            ]}
          />
        </Field>
      </>
    );
  }

  if (active === "art523") {
    return (
      <Field label="Valor executado">
        <NumberInput controller={controller} name="valorDevido" />
      </Field>
    );
  }

  return null;
}

function formatResultValue(controller) {
  if (!controller.result) return "";
  if (controller.activeCalculator === "cpc") return `${controller.result.total} dias úteis`;
  if (controller.activeCalculator === "prev") {
    return controller.result.total ? "Elegível" : "Não elegível";
  }
  return Number(controller.result.total || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function ResultPanel({ controller }) {
  if (!controller.result) {
    return (
      <section className={styles.emptyResult}>
        <Calculator size={30} />
        <strong>Resultado e memória de cálculo</strong>
        <span>Preencha os campos e execute a calculadora para conferir os detalhes.</span>
      </section>
    );
  }

  return (
    <section className={styles.resultPanel}>
      <header>
        <div>
          <span>Resultado estimado</span>
          <strong>{formatResultValue(controller)}</strong>
        </div>
        <FileText size={22} />
      </header>
      <p>{controller.result.summary}</p>
      <div className={styles.detailList}>
        {controller.result.details.map((detail, index) => (
          <div key={`${detail.label}-${index}`} className={styles.detailItem}>
            <div>
              <strong>{detail.label}</strong>
              <span>{detail.desc}</span>
            </div>
            <b>{detail.value}</b>
          </div>
        ))}
      </div>
      {controller.result.notes?.length > 0 && (
        <div className={styles.notes}>
          {controller.result.notes.map((note) => (
            <span key={note}>
              <AlertTriangle size={14} />
              {note}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

export default function CalculatorDashboard() {
  const controller = useLegalCalculator();

  return (
    <LawyerDashboardShell
      activeRoute="calculadora"
      title="Calculadoras Jurídicas"
      subtitle="Memória de cálculo para conferência trabalhista, cível e processual"
      icon={Calculator}
    >
      {controller.loadingProfile ? (
        <div className={styles.loadingPanel}>
          <Loader2 size={22} className={styles.spin} />
          <span>Carregando calculadoras...</span>
        </div>
      ) : !controller.canUse ? (
        <section className={styles.lockPanel}>
          <AlertTriangle size={24} />
          <div>
            <h2>Acesso exclusivo do Plano PRO</h2>
            <p>
              As calculadoras jurídicas avançadas ficam disponíveis no PRO ou em planos Enterprise compatíveis.
            </p>
          </div>
          <button type="button" onClick={controller.openPlansModal}>
            Ver planos
          </button>
        </section>
      ) : (
        <div className={styles.page}>
          <section className={styles.hero}>
            <div>
              <span>Ferramentas de conferência</span>
              <h2>Calcule verbas, prazos, juros e honorários com memória transparente.</h2>
              <p>
                As fórmulas foram reorganizadas para evitar aproximações perigosas e destacar as premissas usadas em cada resultado.
              </p>
            </div>
          </section>

          <section className={styles.workspace}>
            <aside className={styles.sidebar}>
              {CALCULATOR_GROUPS.map((group) => (
                <div key={group.title} className={styles.group}>
                  <span>{group.title}</span>
                  {group.items.map((item) => {
                    const Icon = calculatorIcon(item.id);
                    const active = controller.activeCalculator === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={active ? styles.activeItem : ""}
                        onClick={() => controller.selectCalculator(item.id)}
                      >
                        <Icon size={16} />
                        <div>
                          <strong>{item.label}</strong>
                          <small>{item.description}</small>
                        </div>
                        {active && <ChevronRight size={15} />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </aside>

            <div className={styles.formPanel}>
              <header>
                <div>
                  <span>{controller.activeMeta?.description}</span>
                  <h3>{controller.activeMeta?.label}</h3>
                </div>
              </header>

              <div className={styles.inputGrid}>
                <CalculatorFields controller={controller} />
              </div>

              <footer className={styles.actions}>
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={controller.calculate}
                  disabled={controller.calculating}
                >
                  {controller.calculating ? (
                    <Loader2 size={18} className={styles.spin} />
                  ) : (
                    <Calculator size={18} />
                  )}
                  Calcular agora
                </button>
                <button type="button" onClick={controller.clearCurrent}>
                  <RefreshCw size={17} />
                  Limpar
                </button>
              </footer>
            </div>

            <ResultPanel controller={controller} />
          </section>
        </div>
      )}
    </LawyerDashboardShell>
  );
}
