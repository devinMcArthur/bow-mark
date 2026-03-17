// client/src/components/Chat/DownvoteForm.tsx
import React from "react";
import { Box, VStack, HStack, Text, Checkbox, Textarea, Button } from "@chakra-ui/react";

const REASONS: { value: string; label: string }[] = [
  { value: "wrong_answer", label: "Wrong answer" },
  { value: "hallucinated_citation", label: "Hallucinated citation" },
  { value: "couldnt_find_it", label: "Couldn't find it" },
  { value: "wrong_document", label: "Wrong document" },
  { value: "too_vague", label: "Too vague" },
  { value: "misunderstood_question", label: "Misunderstood the question" },
];

interface DownvoteFormProps {
  initialReasons?: string[];
  initialComment?: string;
  onSubmit: (reasons: string[], comment: string) => void;
  onCancel: () => void;
}

const DownvoteForm = ({
  initialReasons,
  initialComment,
  onSubmit,
  onCancel,
}: DownvoteFormProps) => {
  const [selected, setSelected] = React.useState<Set<string>>(
    new Set(initialReasons ?? [])
  );
  const [comment, setComment] = React.useState(initialComment ?? "");

  const toggle = (value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  };

  return (
    <Box
      mt={2}
      p={3}
      bg="white"
      border="1px solid"
      borderColor="gray.200"
      borderRadius="md"
      maxW="380px"
    >
      <Text fontWeight="600" fontSize="xs" mb={2} color="gray.700">
        What was wrong with this response?
      </Text>
      <VStack align="start" spacing={1.5} mb={3}>
        {REASONS.map(({ value, label }) => (
          <Checkbox
            key={value}
            isChecked={selected.has(value)}
            onChange={() => toggle(value)}
            size="sm"
            colorScheme="blue"
          >
            <Text fontSize="xs" color="gray.600">
              {label}
            </Text>
          </Checkbox>
        ))}
      </VStack>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional comment..."
        size="xs"
        resize="none"
        rows={2}
        mb={2}
        fontSize="xs"
      />
      <HStack justify="flex-end" spacing={2}>
        <Button size="xs" variant="ghost" colorScheme="gray" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="xs"
          colorScheme="blue"
          isDisabled={selected.size === 0}
          onClick={() => onSubmit(Array.from(selected), comment)}
        >
          Submit
        </Button>
      </HStack>
    </Box>
  );
};

export default DownvoteForm;
