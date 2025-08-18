"use client";

import AceEditor, { IAceEditorProps } from "react-ace";

// Import modes and themes for react-ace.
// These imports need to be in a component that is loaded dynamically.
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools";

const AceEditorWrapper = (props: IAceEditorProps) => {
  return <AceEditor {...props} />;
};

export default AceEditorWrapper; 