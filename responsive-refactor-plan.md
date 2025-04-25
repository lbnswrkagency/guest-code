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

**After completing Step 1, please wait for my review before proceeding to Step 2.**

## Step 2: Add Responsive Design

1. Import the `_media-queries.scss` file which contains our media query mixins
2. Add responsive styles using the media query mixins for larger devices:

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
