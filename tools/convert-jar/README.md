# Convert Java JAR to JavaScript for web deployment

This directory contains a recommended workflow and helper scripts to convert a Java `.jar` (eg. a mod or library) to a browser-friendly `.js` file so it can be used in a web-deployed fork (EaglerForge client or similar).

Two recommended approaches:

- TeaVM (free, Java -> JavaScript). Good for pure Java code and many standard library features.
- Bytecoder (Java -> WebAssembly / JS). Better for some cases but more complex.

This repo includes a TeaVM example workflow because it's commonly used for converting Java code to JS for browser usage.

Important: automatic conversion may not work for every JAR. Native code, reflection-heavy libraries, or code requiring Java desktop APIs may fail. Test and adapt.

Quick steps (TeaVM):

1. Install Java 17+ and Maven locally.
2. Put your target JAR somewhere accessible, e.g. `tools/convert-jar/input/my-mod.jar`.
3. Run `convert.sh` with the jar path and a main class (or a small wrapper main that initializes what you need).

Example:
```bash
cd tools/convert-jar
./convert.sh input/my-mod.jar com.example.ModEntrypoint out/app.js
```

Files here:
- `pom-template.xml` - Maven project template that depends on the installed JAR.
- `convert.sh` - helper script that installs the JAR into local Maven repo, generates a simple Maven project, runs the TeaVM build and copies the generated `.js` to the target output.

Limitations and notes:
- TeaVM requires a Java "main" entrypoint (or a reachable set of classes) to start analysis. If the mod is pure library, you may need to create a small wrapper class to call the right initialization code.
- If the JAR relies on Java reflection / dynamic class loading, you might need to add additional TeaVM configuration (keep rules) or rewrite that part.
- For heavy native or thread usage, consider Bytecoder -> WebAssembly instead.

If you want, paste the path to the JAR or upload it here and I can tailor the `convert.sh` run and help produce the `.js` artifact.

Wrapper template
---------------

If the JAR is a library (no main method) you can provide a tiny wrapper `main` that triggers initialization.
Place the wrapper source under `tools/convert-jar/wrapper-template/src/main/java/` and set the wrapper "main class" when calling `convert.sh`.

Example wrapper (`wrapper.ModWrapper`):

```java
package wrapper;

public class ModWrapper {
	public static void main(String[] args) {
		try {
			// Replace the string below with the mod's initializer class name.
			// Using Class.forName will cause static initializers to run so TeaVM can see reachable code.
			Class.forName("com.example.ModMain");
			// If you need to call a known static init method, use reflection to invoke it here.
		} catch (Throwable t) {
			t.printStackTrace();
		}
	}
}
```

Then run the converter using that wrapper as main:

```bash
cd tools/convert-jar
chmod +x convert.sh
./convert.sh input/your-mod.jar wrapper.ModWrapper out/app.js
```

If you don't know which class to reference, provide the JAR and I can inspect it and suggest a reasonable class or generate a wrapper that references several likely entry points.
