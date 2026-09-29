// Common encouragement expressions and original bilingual learning copy; no attributed quotations.
export const correctMessages = [
  {
    "en": "Dream big.",
    "ko": "꿈을 크게 가져요."
  },
  {
    "en": "Start small.",
    "ko": "작게 시작해요."
  },
  {
    "en": "Keep going.",
    "ko": "계속 나아가요."
  },
  {
    "en": "One step at a time.",
    "ko": "한 번에 한 걸음씩."
  },
  {
    "en": "Every step counts.",
    "ko": "모든 걸음에는 의미가 있어요."
  },
  {
    "en": "Practice makes progress.",
    "ko": "연습할수록 나아져요."
  },
  {
    "en": "You can do this.",
    "ko": "해낼 수 있어요."
  },
  {
    "en": "Keep learning.",
    "ko": "계속 배워 나가요."
  },
  {
    "en": "Small steps add up.",
    "ko": "작은 걸음이 쌓여요."
  },
  {
    "en": "Make today count.",
    "ko": "오늘을 의미 있게 만들어요."
  },
  {
    "en": "Build a little every day.",
    "ko": "매일 조금씩 쌓아가요."
  },
  {
    "en": "Your effort matters.",
    "ko": "당신의 노력은 소중해요."
  },
  {
    "en": "Stay curious.",
    "ko": "호기심을 잃지 마요."
  },
  {
    "en": "Learn one more thing.",
    "ko": "하나만 더 배워봐요."
  },
  {
    "en": "Grow at your own pace.",
    "ko": "자신의 속도로 성장해요."
  },
  {
    "en": "Celebrate small wins.",
    "ko": "작은 성공을 기뻐해요."
  },
  {
    "en": "Turn effort into a habit.",
    "ko": "노력을 습관으로 만들어요."
  },
  {
    "en": "Keep your goal in sight.",
    "ko": "목표를 마음에 담아둬요."
  },
  {
    "en": "A little practice goes a long way.",
    "ko": "작은 연습이 큰 도움이 돼요."
  },
  {
    "en": "Make room for growth.",
    "ko": "성장할 여유를 주세요."
  },
  {
    "en": "Challenge yourself.",
    "ko": "스스로에게 도전해요."
  },
  {
    "en": "Let curiosity lead.",
    "ko": "호기심을 따라가 봐요."
  },
  {
    "en": "Build confidence through practice.",
    "ko": "연습으로 자신감을 쌓아요."
  },
  {
    "en": "Learn today, use it tomorrow.",
    "ko": "오늘 배우고 내일 써봐요."
  },
  {
    "en": "Your next step starts here.",
    "ko": "다음 걸음은 여기서 시작돼요."
  },
  {
    "en": "Show up for yourself.",
    "ko": "자신을 위해 꾸준히 해봐요."
  },
  {
    "en": "Keep building your future.",
    "ko": "미래를 차곡차곡 만들어가요."
  },
  {
    "en": "One word opens a door.",
    "ko": "단어 하나가 새 문을 열어요."
  },
  {
    "en": "Remember how far you have come.",
    "ko": "지금까지 걸어온 길을 기억해요."
  },
  {
    "en": "Stay open to new ideas.",
    "ko": "새로운 생각에 마음을 열어요."
  }
];
export const retryMessages = [
  {
    "en": "Don't give up.",
    "ko": "포기하지 마요."
  },
  {
    "en": "Try again.",
    "ko": "다시 도전해요."
  },
  {
    "en": "Mistakes help us learn.",
    "ko": "실수도 배움에 도움이 돼요."
  },
  {
    "en": "Take a breath, then try again.",
    "ko": "숨을 고르고 다시 해봐요."
  },
  {
    "en": "You are still learning.",
    "ko": "지금도 배우는 중이에요."
  },
  {
    "en": "Progress takes time.",
    "ko": "성장에는 시간이 필요해요."
  },
  {
    "en": "One mistake is not the end.",
    "ko": "한 번의 실수가 끝은 아니에요."
  },
  {
    "en": "Be patient with yourself.",
    "ko": "자신을 조금 기다려 주세요."
  },
  {
    "en": "It's okay to slow down.",
    "ko": "조금 천천히 가도 괜찮아요."
  },
  {
    "en": "Rest, then return.",
    "ko": "쉬었다가 다시 이어가요."
  },
  {
    "en": "Every attempt teaches you something.",
    "ko": "도전할 때마다 배우는 게 있어요."
  },
  {
    "en": "Not yet doesn't mean never.",
    "ko": "아직 못해도 계속 못하는 건 아니에요."
  },
  {
    "en": "Start again with what you learned.",
    "ko": "배운 것을 바탕으로 다시 시작해요."
  },
  {
    "en": "Give yourself another chance.",
    "ko": "자신에게 한 번 더 기회를 줘요."
  },
  {
    "en": "Focus on the next step.",
    "ko": "다음 한 걸음에 집중해요."
  },
  {
    "en": "Learning is not a race.",
    "ko": "배움은 속도 경쟁이 아니에요."
  },
  {
    "en": "Review it, then try it.",
    "ko": "다시 익히고 도전해요."
  },
  {
    "en": "Questions lead to learning.",
    "ko": "질문이 배움으로 이어져요."
  },
  {
    "en": "Keep trying, keep growing.",
    "ko": "도전하며 성장해요."
  },
  {
    "en": "A pause is not the end.",
    "ko": "잠깐 멈춰도 끝은 아니에요."
  }
];
const last = {correct:null,retry:null};
export function nextReactionMessage(mood) {
 const group=mood==='wrong'?'retry':'correct';
 const messages=group==='retry'?retryMessages:correctMessages;
 const choices=messages.filter(message=>message!==last[group]);
 const message=choices[Math.floor(Math.random()*choices.length)];
 last[group]=message;
 return message;
}
