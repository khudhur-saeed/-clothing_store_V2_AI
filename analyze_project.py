import os
import ast

def analyze_python_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        try:
            content = f.read()
            tree = ast.parse(content)
        except Exception:
            return None
    
    classes = []
    functions = []
    imports = []
    
    for node in ast.iter_child_nodes(tree):
        if isinstance(node, ast.ClassDef):
            classes.append(node.name)
        elif isinstance(node, ast.FunctionDef):
            functions.append(node.name)
        elif isinstance(node, ast.Import):
            for n in node.names:
                imports.append(n.name)
        elif isinstance(node, ast.ImportFrom):
            imports.append(node.module)
            
    return {"classes": classes, "functions": functions, "imports": imports}

def main():
    backend_dir = "backend/app"
    frontend_dir = "frontend/src"
    
    with open("project_summary.txt", "w", encoding="utf-8") as out:
        out.write("==== BACKEND MODELS ====\n")
        models_dir = os.path.join(backend_dir, "models")
        if os.path.exists(models_dir):
            for f in os.listdir(models_dir):
                if f.endswith(".py") and f != "__init__.py":
                    res = analyze_python_file(os.path.join(models_dir, f))
                    if res:
                        out.write(f"Model: {f} -> Classes: {res['classes']}\n")
                        
        out.write("\n==== BACKEND ROUTERS ====\n")
        routers_dir = os.path.join(backend_dir, "routers")
        if os.path.exists(routers_dir):
            for f in os.listdir(routers_dir):
                if f.endswith(".py") and f != "__init__.py":
                    res = analyze_python_file(os.path.join(routers_dir, f))
                    if res:
                        out.write(f"Router: {f} -> Functions: {res['functions']}\n")
                        
        out.write("\n==== FRONTEND PAGES ====\n")
        pages_dir = os.path.join(frontend_dir, "pages")
        if os.path.exists(pages_dir):
            for root, _, files in os.walk(pages_dir):
                for file in files:
                    out.write(f"Page: {os.path.relpath(os.path.join(root, file), pages_dir)}\n")

        out.write("\n==== FRONTEND COMPONENTS ====\n")
        comps_dir = os.path.join(frontend_dir, "components")
        if os.path.exists(comps_dir):
            for root, _, files in os.walk(comps_dir):
                for file in files:
                    out.write(f"Component: {os.path.relpath(os.path.join(root, file), comps_dir)}\n")

if __name__ == '__main__':
    main()
