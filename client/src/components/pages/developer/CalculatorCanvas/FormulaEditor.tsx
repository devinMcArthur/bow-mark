// client/src/components/pages/developer/CalculatorCanvas/FormulaEditor.tsx
import React, { useEffect, useRef, useState } from "react";
import { Box, Text, Textarea } from "@chakra-ui/react";

// Find the identifier token under (or immediately left of) the cursor
function getWordAtCursor(
  text: string,
  pos: number
): { word: string; start: number; end: number } {
  let start = pos;
  while (start > 0 && /[a-zA-Z0-9_]/.test(text[start - 1])) start--;
  let end = pos;
  while (end < text.length && /[a-zA-Z0-9_]/.test(text[end])) end++;
  return { word: text.slice(start, end), start, end };
}

interface Props {
  value: string;
  variables: string[];
  onChange: (val: string) => void;
}

const FormulaEditor: React.FC<Props> = ({ value, variables, onChange }) => {
  const [localValue, setLocalValue] = useState(value);
  const [cursor, setCursor] = useState(0);
  const [selectedIdx, setSelectedIdx] = useState(0);
  // Track which partial word the user dismissed so Escape stays closed
  // until they type something different
  const [dismissedWord, setDismissedWord] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync when external value changes (e.g. switching selected node)
  useEffect(() => { setLocalValue(value); }, [value]);

  const { word, start, end } = getWordAtCursor(localValue, cursor);

  const suggestions = word.length >= 1
    ? variables
        .filter((v) => v.toLowerCase().startsWith(word.toLowerCase()) && v !== word)
        .slice(0, 8)
    : [];

  const open = suggestions.length > 0 && word !== dismissedWord;

  const commit = (variable: string) => {
    const newValue = localValue.slice(0, start) + variable + localValue.slice(end);
    const newCursor = start + variable.length;
    setLocalValue(newValue);
    setCursor(newCursor);
    setSelectedIdx(0);
    setDismissedWord(null);
    onChange(newValue);
    // Restore focus + cursor position after React re-renders
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = newCursor;
        textareaRef.current.selectionEnd = newCursor;
        textareaRef.current.focus();
      }
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart ?? 0;
    setLocalValue(val);
    setCursor(pos);
    setSelectedIdx(0);
    onChange(val);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!open) return;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
        break;
      case "Tab":
      case "Enter":
        e.preventDefault();
        commit(suggestions[selectedIdx] ?? suggestions[0]);
        break;
      case "Escape":
        e.preventDefault();
        setDismissedWord(word);
        break;
    }
  };

  const handleCursorMove = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setCursor((e.target as HTMLTextAreaElement).selectionStart ?? 0);
  };

  return (
    <Box position="relative">
      <Textarea
        ref={textareaRef}
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onSelect={handleCursorMove}
        onClick={handleCursorMove}
        fontFamily="mono"
        fontSize="xs"
        rows={3}
        resize="vertical"
        bg="purple.50"
        borderColor="purple.200"
        _focus={{ borderColor: "purple.400", boxShadow: "0 0 0 1px #805ad5" }}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
        data-1p-ignore="true"
        data-lpignore="true"
      />

      {open && (
        <Box
          position="absolute"
          top="100%"
          left={0}
          right={0}
          mt="2px"
          bg="white"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          boxShadow="lg"
          zIndex={200}
          overflow="hidden"
        >
          {suggestions.map((v, i) => (
            <Box
              key={v}
              px={2}
              py="5px"
              bg={i === selectedIdx ? "purple.50" : "white"}
              cursor="pointer"
              borderBottom={i < suggestions.length - 1 ? "1px solid" : undefined}
              borderColor="gray.100"
              // preventDefault keeps textarea focused when clicking a suggestion
              onMouseDown={(e) => { e.preventDefault(); commit(v); }}
              onMouseEnter={() => setSelectedIdx(i)}
            >
              <Text as="span" fontFamily="mono" fontSize="xs" color="purple.600" fontWeight="700">
                {v.slice(0, word.length)}
              </Text>
              <Text as="span" fontFamily="mono" fontSize="xs" color="gray.500">
                {v.slice(word.length)}
              </Text>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default FormulaEditor;
