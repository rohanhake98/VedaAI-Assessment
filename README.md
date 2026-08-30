# VedaAI Assessment

AI Assessment Extraction & Answer Mapping application for evaluating handwritten student answer sheets against question papers.

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS

## Project Structure

```text
├── app/
│   ├── layout.tsx         # Root layout with font and metadata configuration
│   ├── page.tsx           # Initial entry placeholder (Upload screen placeholder)
│   ├── globals.css        # Tailwind CSS imports and global styles
│   ├── processing/        # Processing stage route
│   │   └── page.tsx
│   └── assessment/        # Assessment & mapping review route
│       └── page.tsx
├── components/
│   ├── layout/            # Layout wrappers, headers, navigation components
│   ├── upload/            # File upload dropzones, file preview cards
│   ├── processing/        # Progress bars, status steppers, loading indicators
│   ├── assessment/        # Question list, score cards, mapping controls
│   ├── answer-viewer/     # Answer sheet canvas / image viewer with region bounding boxes
│   └── ui/                # Reusable foundational UI elements (buttons, modals, badges)
├── lib/
│   ├── utils.ts           # Classnames helper (cn) and shared utilities
│   └── types.ts           # Core TypeScript domain models (Question, Answer, Assessment)
├── public/                # Public static assets
└── design-reference/      # Exported Figma reference screens and components
    ├── screens/           # Full screen mockups
    └── components/        # Isolated component mockups
```

## Design References

The `design-reference/` directory contains the exported Figma reference screens and component mockups used as the visual source of truth for the final UI:
- `design-reference/screens/upload-empty.png`: Upload Screen (Empty State)
- `design-reference/screens/upload-filled.png`: Upload Screen (Filled State)
- `design-reference/screens/loading.png`: Processing / Loading State
- `design-reference/screens/question-answer-mapping.png`: Question-Answer Mapping & Region View Screen
- `design-reference/components/component-1.png`: Component Reference 1
- `design-reference/components/component-1-1.png`: Component Reference 1-1

## Development Plan

Future implementation stages:

1. Figma UI implementation
2. Upload functionality
3. Processing flow
4. Question extraction
5. Answer extraction
6. Answer-question mapping
7. Answer region highlighting
8. Edge-case handling
9. Optional grading
10. Deployment
