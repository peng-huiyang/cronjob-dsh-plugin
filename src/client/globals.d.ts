/** Ambient declarations for the browser client bundle. */

declare module '*.module.css' {
  /** Hashed class map produced by the lightningcss css-modules transform. */
  const classes: Record<string, string>
  export default classes
}
