# Task Item Alignment Documentation

## Overview

This document describes the alignment system used in the TaskTrove task item component to ensure proper visual hierarchy and consistent spacing.

## Alignment Requirements

The task item component must satisfy two key alignment requirements:

1. **Horizontal Alignment**: Checkboxes must align horizontally with the task title baseline
2. **Vertical Alignment**: Description and metadata must align vertically with the title (not the checkboxes)

## Implementation Details

### Component Structure

The task item uses a nested flexbox layout:

```tsx
<div className="flex gap-3">
  {/* Left Side - Checkboxes */}
  <div className="flex items-start gap-3 flex-shrink-0 pt-1">
    {/* Selection checkbox (if in selection mode) */}
    {/* Task completion checkbox */}
  </div>

  {/* Right Side - Content */}
  <div className="flex-1 min-w-0">
    {/* Title row */}
    {/* Description */}
    {/* Metadata */}
  </div>
</div>
```

### Key Alignment Techniques

1. **Checkbox Container Alignment**
   - Uses `pt-1` (4px) for fine-tuned vertical positioning to center checkboxes with 15px title text
   - `items-start` ensures top alignment with content
   - `flex-shrink-0` prevents checkbox area from collapsing

2. **Title Row Alignment**
   - Uses `items-start` instead of `items-center` to maintain consistent top alignment
   - Title text has `leading-5` class for consistent line height
   - This ensures the checkbox center aligns with the text baseline
   - Title row uses `justify-between` to push action menu to the right

3. **Action Menu Alignment**
   - Positioned on the right side using flexbox `justify-between`
   - Button size reduced to `h-6 w-6` to match title line height
   - Icon size set to `h-3.5 w-3.5` for proper proportions
   - Maintains horizontal alignment with title through consistent sizing

4. **Content Structure**
   - All content (title, description, metadata) is contained within a single flex column
   - This ensures vertical alignment is maintained regardless of checkbox presence

### CSS Classes Used

- **Checkbox container**: `flex items-start gap-3 flex-shrink-0 pt-1`
- **Title row**: `flex items-start justify-between gap-2 mb-1`
- **Title text**: `font-medium text-[15px] cursor-pointer leading-5`
- **Checkbox component**: `size-4` (16px × 16px)
- **Action buttons**: `h-6 w-6` (24px × 24px)
- **Action icons**: `h-3.5 w-3.5` (14px × 14px)

### Visual Result

The implementation achieves:

- Checkboxes visually centered with the title text line
- Description and metadata properly indented and aligned with the title start position
- Consistent spacing maintained across different task configurations

## Text Size Change Instructions

When changing the title text size, the checkbox padding must be adjusted to maintain proper alignment. Follow this guide:

### Current Configuration

- **Text size**: `text-[15px]` (15px)
- **Checkbox padding**: `pt-1` (4px)
- **Line height**: `leading-5` (20px)

### Size Change Formula

The checkbox padding should be calculated as:

```
Checkbox padding = (Text size - 12px) / 4 + 3px
```

**Examples:**

- 14px text: `(14 - 12) / 4 + 3 = 3.5px` → Use `pt-[3px]`
- 15px text: `(15 - 12) / 4 + 3 = 3.75px` → Use `pt-1` (4px)
- 16px text: `(16 - 12) / 4 + 3 = 4px` → Use `pt-1` (4px)
- 18px text: `(18 - 12) / 4 + 3 = 4.5px` → Use `pt-[4.5px]`

### Step-by-Step Process

1. **Change title text size** in both edit and display modes:

   ```tsx
   // Edit mode input
   className = "font-medium text-[NEW_SIZE] h-6 min-w-0 flex-1"

   // Display mode h3
   className = "font-medium text-[NEW_SIZE] leading-5 cursor-pointer..."
   ```

2. **Calculate new padding** using the formula above

3. **Update checkbox container padding**:

   ```tsx
   <div className="flex items-start gap-3 flex-shrink-0 pt-[NEW_PADDING]">
   ```

4. **Test alignment** with different content:
   - Short and long task titles
   - Tasks with and without metadata
   - Selection mode and normal mode

5. **Update this documentation** with the new values

### Common Tailwind Padding Values

- `pt-0` = 0px
- `pt-[1px]` = 1px
- `pt-[2px]` = 2px
- `pt-[3px]` = 3px
- `pt-1` = 4px
- `pt-[4.5px]` = 4.5px
- `pt-[5px]` = 5px
- `pt-[6px]` = 6px

### Historical Changes

- **v1**: 14px text with 3px padding (`pt-[3px]`)
- **v2**: 15px text with 4px padding (`pt-1`) - Current

## Troubleshooting

If alignment issues occur:

1. **Check line height**: Ensure title has `leading-5` class
2. **Verify padding**: Checkbox container should have `pt-1` (4px) for 15px text
3. **Confirm flex alignment**: Both containers should use `items-start`
4. **Test with different content**: Verify alignment with various title lengths and metadata combinations
5. **Use the formula**: If text size changed, recalculate padding using the formula above

## Related Components

- `/components/task/task-item.tsx` - Main task item component
- `/components/ui/checkbox.tsx` - Checkbox component (size-4)
