package wrapper;

public class ModWrapper {
    public static void main(String[] args) {
        try {
            // Replace the string below with the mod's initializer class name.
            // Using Class.forName will cause static initializers to run so TeaVM can see reachable code.
            Class.forName("com.example.ModMain");
            // If you need to call a known static init method, you can do:
            // Class<?> c = Class.forName("com.example.ModMain");
            // c.getMethod("init").invoke(null);
        } catch (Throwable t) {
            t.printStackTrace();
        }
    }
}
