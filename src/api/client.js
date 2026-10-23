import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const apiClient = {
  async getHealth() {
    const res = await api.get('/health');
    return res.data;
  },

  async getTopics() {
    const res = await api.get('/topics');
    return res.data;
  },

  async getTopic(topicId) {
    const res = await api.get(`/topics/${topicId}`);
    return res.data;
  },

  async getGates() {
    const res = await api.get('/gates');
    return res.data;
  },

  async simulateCircuit(circuit, shots = 1000) {
    const res = await api.post('/circuits/simulate', { circuit, shots });
    return res.data;
  },

  async exportCircuit(circuit) {
    const res = await api.post('/circuits/export', { circuit });
    return res.data;
  },

  async askTutor(question, topicId = null, conceptId = null, circuit = null, simulationResult = null, conversationHistory = null, quizState = null, learningContext = null) {
    const payload = {
      question,
      topic_id: topicId || (learningContext?.topicId || null),
      concept_id: conceptId || (learningContext?.conceptId || null),
      circuit: circuit || (learningContext?.circuit || null),
      simulation_result: simulationResult || (learningContext?.simulationResult || null),
      conversation_history: conversationHistory,
      quiz_state: quizState,
      learning_context: learningContext ? {
        route: learningContext.route,
        module_id: learningContext.moduleId,
        module_title: learningContext.moduleTitle,
        topic_id: learningContext.topicId,
        topic_title: learningContext.topicTitle,
        concept_id: learningContext.conceptId,
        concept_title: learningContext.conceptTitle,
        section_id: learningContext.sectionId,
        section_title: learningContext.sectionTitle,
        visible_content_id: learningContext.visibleContentId,
        visible_content_type: learningContext.visibleContentType,
        visible_visual: learningContext.visibleVisual ? {
          id: learningContext.visibleVisual.id,
          title: learningContext.visibleVisual.title,
          type: learningContext.visibleVisual.type,
          caption: learningContext.visibleVisual.caption,
          data: learningContext.visibleVisual.data,
          description: learningContext.visibleVisual.description
        } : null,
        circuit: learningContext.circuit,
        simulation_result: learningContext.simulationResult,
        student_state: learningContext.studentState ? {
          visited_topics: learningContext.studentState.visited_topics || [],
          completed_topics: learningContext.studentState.completed_topics || [],
          quiz_history: learningContext.studentState.quiz_history || [],
          weak_concepts: learningContext.studentState.weak_concepts || [],
          mastery: learningContext.studentState.mastery || {},
          circuits_run_count: learningContext.studentState.circuits_run_count || 0
        } : null
      } : null
    };
    const res = await api.post('/tutor/ask', payload, { timeout: 90000 });
    return res.data;
  },

  async checkAssessment(topicId, questionId, selectedOption) {
    const res = await api.post('/assessment/check', {
      topic_id: topicId,
      question_id: questionId,
      selected_option: selectedOption
    });
    return res.data;
  }
};

export default apiClient;
