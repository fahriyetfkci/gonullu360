import { createField, createId } from "./form.schema";
function formReducer(state, action) {
  switch (action.type) {
    case "REPLACE_SCHEMA":
      return action.schema;
    case "SET_TITLE":
      return { ...state, title: action.title };
    case "SET_DESCRIPTION":
      return { ...state, description: action.description };
    case "ADD_SECTION":
      return {
        ...state,
        sections: [...state.sections, { id: createId("section"), title: "", fields: [] }]
      };
    case "REMOVE_SECTION":
      if (state.sections.length === 1) return state;
      return { ...state, sections: state.sections.filter((section) => section.id !== action.sectionId) };
    case "UPDATE_SECTION":
      return {
        ...state,
        sections: state.sections.map(
          (section) => section.id === action.sectionId ? { ...section, title: action.title } : section
        )
      };
    case "ADD_FIELD":
      return {
        ...state,
        sections: state.sections.map((section) => {
          if (section.id !== action.sectionId) return section;
          const fields = [...section.fields];
          fields.splice(action.index ?? fields.length, 0, createField(action.fieldType));
          return { ...section, fields };
        })
      };
    case "MOVE_FIELD": {
      let movingField;
      const withoutField = state.sections.map((section) => {
        const found = section.fields.find((field) => field.id === action.fieldId);
        if (found) movingField = found;
        return { ...section, fields: section.fields.filter((field) => field.id !== action.fieldId) };
      });
      if (!movingField) return state;
      return {
        ...state,
        sections: withoutField.map((section) => {
          if (section.id !== action.sectionId) return section;
          const fields = [...section.fields];
          fields.splice(Math.min(action.index, fields.length), 0, movingField);
          return { ...section, fields };
        })
      };
    }
    case "UPDATE_FIELD":
      return {
        ...state,
        sections: state.sections.map((section) => ({
          ...section,
          fields: section.fields.map(
            (field) => field.id === action.fieldId ? { ...field, ...action.changes } : field
          )
        }))
      };
    case "REMOVE_FIELD":
      return {
        ...state,
        sections: state.sections.map((section) => ({
          ...section,
          fields: section.fields.filter((field) => field.id !== action.fieldId)
        }))
      };
    default:
      return state;
  }
}
export {
  formReducer
};
