import { throttledCompletion } from '@/services/openai';

export const checkAnswerWithAI = async (
  userAnswer: string,
  solution: string,
  type: string,
  question: string
): Promise<{ isCorrect: boolean; feedback: string }> => {
  const prompt = `
Тапсырма: Оқушының ${type} түріндегі сұраққа берген жауабын бағала.

Сұрақ: ${question}
Дұрыс жауап: ${solution}
Оқушының жауабы: ${userAnswer}

Бағалау өлшемдері:
1. Мазмұндық дұрыстық (негізгі ұғымдар мен анықтамалардың дұрыстығы)
2. Толықтық (барлық негізгі тармақтардың қамтылуы)
3. Техникалық дәлдік (терминология мен есептеулердің дұрыстығы)
4. Түсінік тереңдігі

Тек қана мына JSON форматында жауап бер (басқа мәтін жоқ):
{
  "isCorrect": boolean,
  "score": number (0-100),
  "feedback": "Жауаптың дұрыстығын немесе қателерін қазақ тілінде түсіндіретін егжей-тегжейлі педагогикалық кері байланыс",
  "keyPointsCovered": ["қамтылған", "негізгі", "тармақтар"],
  "missingConcepts": ["жетіспейтін", "ұғымдар"],
  "improvementSuggestions": ["нақты", "жақсарту", "ұсыныстары"]
}`;

  try {
    const completion = await throttledCompletion([
      {
        role: "system",
        content: "Сен білім беру саласындағы тәжірибелі бағалаушысың. Оқушылардың жауаптарын бағалап, кері байланысты ТІКЕЛЕЙ ҚАЗАҚ ТІЛІНДЕ береді. Барлық пікірлер, түсіндірмелер және ұсыныстар қазақ тілінде жазылуы МІНДЕТТІ. Ешқашан ағылшын немесе орыс тілінде жауап берме."
      },
      { role: "user", content: prompt }
    ]);

    const raw = completion.choices[0]?.message?.content || '{}';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const response = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

    const score = response.score ?? 0;
    const feedback = response.feedback || 'Жауап бағаланды.';
    const covered = response.keyPointsCovered?.join(', ') || '—';
    const missing = response.missingConcepts?.join(', ') || '—';
    const suggestions = response.improvementSuggestions?.join(', ') || '—';

    return {
      isCorrect: score >= 70,
      feedback: `Баға: ${score}%\n\nКері байланыс:\n${feedback}\n\nДұрыс қамтылған тармақтар: ${covered}\n\nЖетіспейтін ұғымдар: ${missing}\n\nЖақсарту ұсыныстары: ${suggestions}`
    };
  } catch (error) {
    console.error('AI answer checking failed:', error);
    return {
      isCorrect: false,
      feedback: 'Бағалау жүйесі уақытша қолжетімсіз. Жауабыңызды өлшемдер бойынша өзіңіз тексеріңіз.'
    };
  }
}; 