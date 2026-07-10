// Babel config — present so Next.js 16 Turbopack routes user .tsx files
// through Babel, which lets `babel-plugin-transform-react-jsx-location`
// inject data-source="<file>:<line>:<col>" onto every JSX element.
//
// Why: the Kodagen Builder hosts the live preview in an iframe and
// supports click-to-edit. EditorBridge inside the iframe reads the
// data-source attribute on the clicked element and reports the exact
// file + line back to the parent, so the editing AI gets a precise
// pointer instead of having to grep the file tree.
//
// Next.js 16 + Turbopack behavior: detecting this file routes user
// files through Babel; Next.js internals continue to use SWC. The
// next/babel preset preserves the framework-required JSX handling.
//
// Plugin docs: https://github.com/adrianton3/babel-plugin-transform-react-jsx-location

module.exports = {
  presets: ['next/babel'],
  plugins: [
    [
      'babel-plugin-transform-react-jsx-location',
      {
        // Default filename mode: full path (or relative to sourceRoot).
        // 'compact' mode returns just the basename, which Next.js's
        // Babel pipeline serves as literally "relative" — useless for
        // mapping clicks back to a file. Default mode gives real paths.
        attributeName: 'data-source',
      },
    ],
  ],
};
