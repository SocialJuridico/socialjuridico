const MONTHS = {
  "01": "Janeiro",
  "02": "Fevereiro",
  "03": "Março",
  "04": "Abril",
  "05": "Maio",
  "06": "Junho",
  "07": "Julho",
  "08": "Agosto",
  "09": "Setembro",
  10: "Outubro",
  11: "Novembro",
  12: "Dezembro",
};

export function mergeReportData({
  accesses = [],
  lawyers = [],
  clients = [],
  limit = 7,
}) {
  const valuesByDate = new Map();

  function ensureDate(date) {
    if (!valuesByDate.has(date)) {
      valuesByDate.set(date, {
        date,
        accesses: 0,
        lawyers: 0,
        clients: 0,
      });
    }

    return valuesByDate.get(date);
  }

  accesses.forEach((item) => {
    ensureDate(item.date).accesses =
      Number(item.count) || 0;
  });

  lawyers.forEach((item) => {
    ensureDate(item.date).lawyers =
      Number(item.count) || 0;
  });

  clients.forEach((item) => {
    ensureDate(item.date).clients =
      Number(item.count) || 0;
  });

  return Array.from(valuesByDate.values())
    .sort((first, second) =>
      first.date.localeCompare(second.date),
    )
    .slice(-limit);
}

export function formatReportDay(value) {
  if (!value) {
    return "";
  }

  const [year, month, day] =
    value.split("-");

  return `${day}/${month}/${year}`;
}

export function formatReportWeek(value) {
  if (!value) {
    return "";
  }

  const [year, week] =
    value.split("-W");

  return `Semana ${week} (${year})`;
}

export function formatReportMonth(value) {
  if (!value) {
    return "";
  }

  const [year, month] =
    value.split("-");

  return `${
    MONTHS[month] || month
  } de ${year}`;
}

export function sumLastPeriod(
  values = [],
  limit,
) {
  return values
    .slice(-limit)
    .reduce(
      (total, item) =>
        total +
        (Number(item.count) || 0),
      0,
    );
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString(
    "pt-BR",
  );
}