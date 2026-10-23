import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { getStudentLearningState } from '../utils/progress';

const defaultContextState = {
  route: typeof window !== 'undefined' ? window.location.pathname : '/',
  moduleId: null,
  moduleTitle: null,
  topicId: null,
  topicTitle: null,
  conceptId: null,
  conceptTitle: null,
  sectionId: null,
  sectionTitle: null,
  visibleContentId: null,
  visibleContentType: 'overview', // 'overview', 'concept', 'diagram', 'circuit', 'practice'
  visibleVisual: null, // { id, title, type, caption, data, description }
  circuit: null,
  simulationResult: null
};

const defaultContext = {
  contextState: defaultContextState,
  tutorState: { isOpen: false, initialQuestion: null },
  setTopicContext: () => {},
  setConceptContext: () => {},
  setVisibleVisualContext: () => {},
  setCircuitContext: () => {},
  updateRoute: () => {},
  getStructuredLearningContext: () => ({ ...defaultContextState, studentState: getStudentLearningState() }),
  openTutor: () => {},
  closeTutor: () => {}
};

const LearningContext = createContext(defaultContext);

export function LearningProvider({ children }) {
  const [contextState, setContextState] = useState(defaultContextState);
  const contextStateRef = useRef(contextState);
  contextStateRef.current = contextState;

  const [tutorState, setTutorState] = useState({
    isOpen: false,
    initialQuestion: null
  });

  const setTopicContext = useCallback((topic) => {
    if (!topic) return;
    setContextState(prev => {
      const nextTopicId = topic.topicId !== undefined ? topic.topicId : (topic.id || prev.topicId);
      const nextTopicTitle = topic.topicTitle || topic.title || prev.topicTitle;
      const nextModuleId = topic.moduleId || prev.moduleId;
      const nextModuleTitle = topic.moduleTitle || prev.moduleTitle;
      if (
        prev.topicId === nextTopicId &&
        prev.topicTitle === nextTopicTitle &&
        prev.moduleId === nextModuleId &&
        prev.moduleTitle === nextModuleTitle
      ) {
        return prev;
      }
      return {
        ...prev,
        topicId: nextTopicId,
        topicTitle: nextTopicTitle,
        moduleId: nextModuleId,
        moduleTitle: nextModuleTitle
      };
    });
  }, []);

  const setConceptContext = useCallback((concept) => {
    if (!concept) return;
    setContextState(prev => {
      const nextConceptId = concept.conceptId !== undefined ? concept.conceptId : (concept.id || prev.conceptId);
      const nextConceptTitle = concept.conceptTitle || concept.title || prev.conceptTitle;
      const nextSectionId = concept.sectionId || concept.conceptId || concept.id || prev.sectionId;
      const nextSectionTitle = concept.sectionTitle || concept.conceptTitle || concept.title || prev.sectionTitle;
      const nextVisibleContentId = concept.visibleContentId || concept.id || prev.visibleContentId;
      const nextVisibleContentType = concept.visibleContentType || 'concept';

      if (
        prev.conceptId === nextConceptId &&
        prev.conceptTitle === nextConceptTitle &&
        prev.sectionId === nextSectionId &&
        prev.sectionTitle === nextSectionTitle &&
        prev.visibleContentId === nextVisibleContentId &&
        prev.visibleContentType === nextVisibleContentType
      ) {
        return prev;
      }

      return {
        ...prev,
        conceptId: nextConceptId,
        conceptTitle: nextConceptTitle,
        sectionId: nextSectionId,
        sectionTitle: nextSectionTitle,
        visibleContentId: nextVisibleContentId,
        visibleContentType: nextVisibleContentType
      };
    });
  }, []);

  const setVisibleVisualContext = useCallback((visual) => {
    setContextState(prev => {
      if (!visual && !prev.visibleVisual) return prev;
      if (
        visual &&
        prev.visibleVisual &&
        visual.title === prev.visibleVisual.title &&
        visual.caption === prev.visibleVisual.caption &&
        visual.type === prev.visibleVisual.type &&
        visual.description === prev.visibleVisual.description
      ) {
        return prev;
      }
      return {
        ...prev,
        visibleVisual: visual,
        visibleContentType: visual ? 'diagram' : prev.visibleContentType
      };
    });
  }, []);

  const setCircuitContext = useCallback(({ circuit, simulationResult }) => {
    setContextState(prev => {
      const nextCircuit = circuit !== undefined ? circuit : prev.circuit;
      const nextSim = simulationResult !== undefined ? simulationResult : prev.simulationResult;
      if (prev.circuit === nextCircuit && prev.simulationResult === nextSim) {
        return prev;
      }
      return {
        ...prev,
        circuit: nextCircuit,
        simulationResult: nextSim,
        visibleContentType: 'circuit'
      };
    });
  }, []);

  const updateRoute = useCallback((newRoute) => {
    setContextState(prev => {
      if (prev.route === newRoute) return prev;
      return {
        ...prev,
        route: newRoute
      };
    });
  }, []);

  const getStructuredLearningContext = useCallback(() => {
    const studentState = getStudentLearningState();
    const curr = contextStateRef.current;
    return {
      route: curr.route,
      moduleId: curr.moduleId,
      moduleTitle: curr.moduleTitle,
      topicId: curr.topicId,
      topicTitle: curr.topicTitle,
      conceptId: curr.conceptId,
      conceptTitle: curr.conceptTitle,
      sectionId: curr.sectionId,
      sectionTitle: curr.sectionTitle,
      visibleContentId: curr.visibleContentId,
      visibleContentType: curr.visibleContentType,
      visibleVisual: curr.visibleVisual,
      circuit: curr.circuit,
      simulationResult: curr.simulationResult,
      studentState
    };
  }, []);

  const openTutor = useCallback((options = {}) => {
    if (options.topicId !== undefined || options.conceptId !== undefined || options.visibleVisual !== undefined) {
      setContextState(prev => ({
        ...prev,
        topicId: options.topicId !== undefined ? options.topicId : prev.topicId,
        topicTitle: options.topicTitle || prev.topicTitle,
        conceptId: options.conceptId !== undefined ? options.conceptId : prev.conceptId,
        conceptTitle: options.conceptTitle !== undefined ? options.conceptTitle : prev.conceptTitle,
        visibleVisual: options.visibleVisual !== undefined ? options.visibleVisual : prev.visibleVisual,
        circuit: options.circuit !== undefined ? options.circuit : prev.circuit,
        simulationResult: options.simulationResult !== undefined ? options.simulationResult : prev.simulationResult
      }));
    }
    setTutorState({
      isOpen: true,
      initialQuestion: options.initialQuestion || null
    });
  }, []);

  const closeTutor = useCallback(() => {
    setTutorState(prev => ({
      ...prev,
      isOpen: false,
      initialQuestion: null
    }));
  }, []);

  const value = useMemo(() => ({
    contextState,
    tutorState,
    setTopicContext,
    setConceptContext,
    setVisibleVisualContext,
    setCircuitContext,
    updateRoute,
    getStructuredLearningContext,
    openTutor,
    closeTutor
  }), [
    contextState,
    tutorState,
    setTopicContext,
    setConceptContext,
    setVisibleVisualContext,
    setCircuitContext,
    updateRoute,
    getStructuredLearningContext,
    openTutor,
    closeTutor
  ]);

  return (
    <LearningContext.Provider value={value}>
      {children}
    </LearningContext.Provider>
  );
}

export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) {
    return defaultContext;
  }
  return context;
}

export default LearningContext;
