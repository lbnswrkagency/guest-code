# Responsive Design Refactoring Plan

## Overview

This plan outlines a two-step process to refactor our app from mobile-only to fully responsive across all device sizes.

## Input

- You will receive a component with its JS and SCSS files
- The current design is mobile-only (smartphone)

## Step 1: Clean and Standardize

1. Remove all unused code from both JS and SCSS files
2. Ensure all classnames follow the component-based naming convention (e.g., `componentName-element`)
3. Extract any necessary styles from existing media queries and apply them to the base styles
4. Remove all media queries - the resulting CSS will represent our mobile-first design

**IMPORTANT:** The base styles (without media queries) should be for the smallest mobile device. We are building from small to big, so the initial styling should work properly on the smallest screens without any media queries. Only after completing Step 1 and receiving approval, we will add responsive enhancements for larger screens in Step 2.

**After completing Step 1, please wait for my review before proceeding to Step 2.**

## Step 2: Add Responsive Design

1. Import the `_media-queries.scss` file which contains our media query mixins
2. Add responsive styles using the media query mixins for larger devices

   ```scss
   @import "../_media-queries.scss";

   .component {
     // Mobile styles (default)

     @include mq(tablet) {
       // Tablet styles
     }

     @include mq(laptop) {
       // Laptop styles
     }

     @include mq(desktop) {
       // Desktop styles
     }
   }
   ```

**EXTREMELY IMPORTANT:** After completing Step 1, you must ONLY work within media queries in Step 2.

- DO NOT modify the base styles that were established in Step 1
- All responsive adjustments must be contained solely within media query blocks
- The mobile-first approach means we only add styles for larger screens, not modify existing ones
- Base styles remain untouched during Step 2, even for minor adjustments
- Any touch-ups needed for mobile view must be handled by returning to Step 1

**After completing Step 2, please wait for my review and debugging.**

## Media Query Reference

The `_media-queries.scss` file contains these breakpoints:

- tablet: 768px
- tablet-landscape: 992px
- laptop: 1200px
- desktop: 1500px
- desktop-large: 1920px
- desktop-extra-large: 2560px

Use the `@include mq(key)` mixin to apply styles at these breakpoints.
