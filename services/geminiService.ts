
import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { BrandPersona, AnalysisRequest, CustomInputs, PersonaFieldKey, FieldGuide, FIELD_METADATA, BuilderState } from "../types";

// API Key needs to be quoted as a string literal
const ai = new GoogleGenAI({ apiKey: "AIzaSyCMO5BlFviSyKVLDo0eZu0xdbdbutC_f9c" });

// Helper for robust JSON extraction
const extractJson = (text: string): any => {
  try {
    // 1. Try finding the first '{' and last '}'
    const firstOpen = text.indexOf('{');
    const lastClose = text.lastIndexOf('}');
    
    if (firstOpen !== -1 && lastClose !== -1 && lastClose > firstOpen) {
      const jsonStr = text.substring(firstOpen, lastClose + 1);
      return JSON.parse(jsonStr);
    }
    
    // 2. Fallback: Try parsing the whole text if clean
    return JSON.parse(text);
  } catch (e) {
    console.error("JSON Extraction Failed:", e);
    throw new Error("Failed to parse JSON response from AI.");
  }
};

// --- High Quality Reference Example (The Gold Standard) ---
const EXCELLENT_EXAMPLE = `
[Tone & Manner Reference: 더 벙커 (The Bunker)]
1. 브랜드철학: "게이머의 1초를 지배하다". 우리는 단순한 PC방이 아닌 'e스포츠 아레나'를 지향합니다. 승부를 결정짓는 하이엔드 스펙으로 프로게이머급 환경을 제공합니다.
2. 핵심기술: "G-Sync Ultimate Zone". 전 좌석 RTX 4080, 360Hz 모니터, 자체 개발 '아이스 쿨링 시트'. 그리고 매장 내 미세먼지와 담배 냄새를 0으로 만드는 '퓨어 에어 챔버(Pure Air Chamber)' 시스템.
3. 핵심전략: "Shop-in-Shop Gastronomy". PC 이용료 외에 자체 F&B 브랜드 '벙커 키친'을 통해 '맛집보다 맛있는 PC방'을 구축, 객단가를 극대화하는 전략.
4. 기능적 혜택(고통해결): '어둡고 칙칙하고 냄새나는 지하'라는 PC방의 고정관념 타파. 지상 채광 설계와 호텔급 공조 시스템으로 '여자친구와 함께 오고 싶은 쾌적한 데이트 코스'를 구현했습니다.
5. 고객문화창조: 1단계(환경 혁신: 냄새나지 않는 쾌적함) -> 2단계(장비 혁신: 집보다 좋은 최고급 사양) -> 3단계(커뮤니티: 동네 리그가 열리는 e스포츠 성지).
`;

const SYSTEM_INSTRUCTION = `
당신은 세계 최고의 브랜드 전략가(CBO)입니다. 
당신의 임무는 단순한 '설명'이 아니라, 시장을 관통하는 날카로운 '전략'과 '페르소나'를 창조하는 것입니다.

[작성 절대 원칙]
1. **독립성(Singular Focus):** 사용자가 PC방, 만화카페, 포차 중 하나의 아이디어를 입력하면, 오직 해당 업종의 특성에만 집중하세요. 절대 서로 다른 업종(예: PC방에 만화카페 컨셉)을 억지로 섞지 마세요.
2. **구체성(Specifics):** "좋은 시설", "맛있는 음식" 같은 추상적인 표현을 절대 금지합니다. 대신 "RTX 4080", "독립형 굴방", "레트로 네온 사인"과 같이 업종에 맞는 구체적인 스펙과 묘사를 사용하세요.
3. **문제 해결(Problem Solving):** 해당 업종의 고객이 겪는 구체적인 '고통(Pain Point)'을 정의하고, 기술적/시스템적 해결책을 제시하세요.
4. **독자적 명명(Naming):** 남들이 다 쓰는 용어 대신, 우리 브랜드만의 내부 용어(예: 퓨어 에어 챔버, 힐링 캡슐, 홍콩 느와르 존 등)를 정의하여 사용하세요.
5. **톤앤매너:** 부드러운 설명문이 아니라, 확신에 찬 '선언문'이나 전문적인 '기획서' 스타일로 작성하세요.
6. **형식(Format):** 가독성을 위해 **소제목(###)**, **불렛 포인트(-)**, **볼드체(**)**를 적극적으로 사용하여 구조화하세요. 복잡한 마크다운(표, 코드블록 등)은 사용하지 마세요.
`;

// --- Standard Generation (Simple Mode) ---
export const generateBrandPersonaData = async (request: AnalysisRequest): Promise<BrandPersona> => {
  const { idea, url, brandName, customInputs } = request;

  let customInstructions = "";
  if (customInputs) {
    Object.entries(customInputs).forEach(([key, value]) => {
        if (value && value.trim().length > 0) {
            customInstructions += `- ${key}: ${value}\n`;
        }
    });
  }

  const prompt = `
    ${SYSTEM_INSTRUCTION}

    사용자가 입력한 아이디어의 업종(PC방, 만화카페, 포차 등)을 정확히 파악하고,
    그 업종의 본질에 맞는 완벽한 브랜드 페르소나 JSON을 완성하세요.
    
    [Reference Example (이 수준의 깊이로 작성하세요)]
    ${EXCELLENT_EXAMPLE}

    [입력 정보]
    - 브랜드/사업 아이디어: ${idea}
    - 참고 URL: ${url || "없음"}
    - 확정된 브랜드명: ${brandName || "미정 (AI가 브랜드 컨셉에 맞는 이름 3가지 제안 및 그 중 최적의 하나를 brandName으로 선정)"}

    ${customInstructions ? `[사용자 추가 가이드]\n${customInstructions}` : ""}

    [요청 사항]
    JSON 객체로 반환하세요. 각 항목은 최소 300자 이상(목록형 제외)의 깊이 있는 내용이어야 합니다.
    
    [JSON 필드 구조 (총 17개 항목 + Pomelli)]
    1. brandName
    2. brandNameSuggestions
    3. philosophy
    4. slogan
    5. coreTechnology
    6. coreStrategy
    7. brandMent
    8. targetAudience
    9. genZValue
    10. customerCulture
    11. comparativeAdvantage
    12. qualityLevel
    13. priceLevel
    14. functionalBenefit
    15. experientialBenefit
    16. symbolicBenefit
    17. keywords (Array)
    18. customerManagement
    19. pomelli: {
         businessOverview, tagline, brandArchetype, toneOfVoice[], brandAesthetic[], typography,
         colors: [{ name, hex, description }] (최소 5가지 색상: Main, Secondary, Accent, Neutral 1, Neutral 2),
         brandValues: [{ title, description }]
    }

    반드시 JSON 포맷만 반환하세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned");
    return extractJson(text) as BrandPersona;
  } catch (error) {
    console.error("Error generating brand persona:", error);
    throw error;
  }
};

// --- Builder Mode Functions ---

// 1. Generate Planning Guides
export const generatePlanningGuides = async (idea: string, brandName?: string): Promise<Record<string, string[]>> => {
  const fieldsList = FIELD_METADATA.map(f => f.key).join(", ");
  
  const prompt = `
    당신은 까다롭고 날카로운 브랜드 컨설팅 퍼실리테이터입니다.
    사용자 아이디어: "${idea}"
    브랜드명: "${brandName || "미정"}"

    다음 17가지 항목에 대해 사용자에게 질문할 "기획 가이드(질문)" 3가지를 제안하세요.
    업종에 맞는 구체적이고 날카로운 질문이어야 합니다.

    대상 항목: ${fieldsList}
    
    응답 포맷 (JSON):
    {
      "philosophy": ["질문1", "질문2", "질문3"],
      ...
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const text = response.text;
    if (!text) throw new Error("No guides returned");
    return extractJson(text);
  } catch (error) {
    console.error("Error generating guides:", error);
    throw error;
  }
};

// 2. Generate Draft for a SINGLE field
export const generateFieldDraft = async (
  fieldKey: string, 
  idea: string, 
  userInput: string, 
  context: string,
  brandName?: string
): Promise<string> => {
  
  const finalBrandName = brandName || "미정";

  const prompt = `
    ${SYSTEM_INSTRUCTION}
    
    [확정된 브랜드명]: ${finalBrandName}
    현재 작성 중인 항목: "${fieldKey}"
    브랜드 아이디어: "${idea}"
    
    [사용자의 핵심 기획 의도]: "${userInput}"
    [참고 - 다른 항목들]: ${context}

    [요청]
    위 내용을 바탕으로 항목(${fieldKey})을 작성하세요.
    설명 없이 내용만 반환하세요.
    소제목(###), 불렛 포인트(-) 사용. 최소 300자.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "내용을 생성할 수 없습니다.";
  } catch (error) {
    console.error(`Error generating draft for ${fieldKey}:`, error);
    return "오류가 발생했습니다.";
  }
};

// 3. Finalize and Assemble
export const finalizePersona = async (idea: string, builderState: BuilderState): Promise<BrandPersona> => {
  let summary = "";
  Object.entries(builderState).forEach(([key, state]) => {
    summary += `[${key}]: ${state.draft}\n`;
  });

  const prompt = `
    ${SYSTEM_INSTRUCTION}

    [브랜드 아이디어]: ${idea}
    [확정된 브랜드 기획 내용]:
    ${summary}

    위 내용을 종합하여 최종 "BrandPersona" JSON 객체를 완성하세요.
    
    Pomelli (Business DNA) 섹션 필수 포함:
    - colors: Main, Secondary, Accent, Neutral 1, Neutral 2 등 최소 5가지 이상의 색상 팔레트.
    
    반드시 JSON 포맷만 반환하세요. 마크다운 코드 블록을 포함하지 마세요.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    
    const text = response.text;
    if (!text) throw new Error("No data returned");

    // Use robust JSON extraction
    return extractJson(text) as BrandPersona;
  } catch (error) {
    console.error("Error finalizing persona:", error);
    throw error;
  }
};

// --- Image Gen ---
export const generateBrandImage = async (prompt: string): Promise<string | null> => {
  try {
    // Using gemini-2.5-flash-image (Nano Banana) for unlimited usage
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: prompt }] },
      config: {
        // Relaxed safety settings to prevent false positives
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH }
        ]
      }
    });
    
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Image Gen Error", error);
    return null;
  }
};

export const generateImageWithCustomStyle = async (request: AnalysisRequest, persona: BrandPersona): Promise<string | null> => {
    // Flash Image model prefers simple, keyword-heavy prompts
    const aesthetic = persona.pomelli?.brandAesthetic?.slice(0, 3).join(", ") || "Modern";
    const colors = persona.pomelli?.colors?.slice(0, 2).map(c => c.name).join(", ") || "Brand Colors";
    
    // Simplified prompt structure for higher success rate with Nano Banana
    const prompt = `Interior photography of ${persona.brandName}, ${aesthetic} style, ${colors} color palette, photorealistic, 8k, cinematic lighting`;

    return generateBrandImage(prompt);
};
