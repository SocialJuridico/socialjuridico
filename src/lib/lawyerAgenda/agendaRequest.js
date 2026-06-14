import { NextResponse } from "next/server";

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function errorResponse(message, errors = {}) {
  return NextResponse.json(
    { success: false, message, errors },
    {
      status: 400,
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
      },
    },
  );
}

export async function prepareAgendaPatchRequest(request) {
  const body = await request.json().catch(() => ({}));
  const startValue = body.date ?? body.startAt;
  const hasStart = startValue !== undefined && startValue !== null && startValue !== "";
  const hasEndField = hasOwn(body, "endDate") || hasOwn(body, "endAt");
  let endValue = body.endDate ?? body.endAt;

  if (hasEndField && !hasStart) {
    return {
      response: errorResponse(
        "Informe o início ao alterar o término do compromisso.",
        { date: "O início é obrigatório nesta alteração." },
      ),
    };
  }

  if (hasStart) {
    const start = new Date(startValue);
    if (Number.isNaN(start.getTime())) {
      return {
        response: errorResponse("Informe uma data de início válida.", {
          date: "Data de início inválida.",
        }),
      };
    }

    if (!hasEndField || endValue === null || endValue === "") {
      endValue = new Date(start.getTime() + 60 * 60 * 1000).toISOString();
      body.endDate = endValue;
      delete body.endAt;
    }

    const end = new Date(endValue);
    if (Number.isNaN(end.getTime()) || end <= start) {
      return {
        response: errorResponse(
          "O término deve ocorrer após o início do compromisso.",
          { endDate: "Revise a data e a hora de término." },
        ),
      };
    }

    if (end.getTime() - start.getTime() > 7 * 24 * 60 * 60 * 1000) {
      return {
        response: errorResponse(
          "A duração máxima de um compromisso é de 7 dias.",
          { endDate: "Reduza a duração do compromisso." },
        ),
      };
    }
  }

  const headers = new Headers(request.headers);
  headers.set("Content-Type", "application/json");
  headers.delete("Content-Length");

  return {
    request: new Request(request.url, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    }),
  };
}
