export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

export function getRatingTone(rating) {
  const value = Number(rating || 0);
  if (value >= 4) return "positive";
  if (value <= 2) return "negative";
  return "neutral";
}

export function getRatingLabel(rating) {
  const value = Number(rating || 0);
  if (value >= 4) return "Positiva";
  if (value <= 2) return "Negativa";
  return "Neutra";
}

export function calculateReviewSummary(reviews) {
  const total = reviews.length;
  const sum = reviews.reduce(
    (accumulator, review) => accumulator + Number(review.nota || 0),
    0,
  );

  return {
    total,
    average: total ? Number((sum / total).toFixed(1)) : null,
    positive: reviews.filter((review) => Number(review.nota) >= 4).length,
    neutral: reviews.filter((review) => Number(review.nota) === 3).length,
    negative: reviews.filter((review) => Number(review.nota) <= 2).length,
    withComment: reviews.filter((review) => review.justificativa?.trim()).length,
  };
}
