import json

with open("/home/ubuntu/SherlockBia/SherlockBia-main/character_names.txt", "r", encoding="utf-8") as f:
    character_names = [line.strip() for line in f.readlines()]

# Adicionar a personagem principal 'Bia' explicitamente
character_names.append("Bia")

image_generation_requests = []
for name in character_names:
    prompt = f"Ícone de personagem em estilo cartoon para um jogo de detetive infantil. O personagem é '{name}'. O ícone deve ser um retrato do personagem, com um fundo transparente, em um estilo de desenho animado simples e amigável. O personagem deve ter uma expressão facial que corresponda à sua personalidade (por exemplo, 'Leo, o comilão' pode estar sorrindo com um biscoito na mão). O ícone deve ser quadrado e ter um contorno preto grosso."
    file_path = f"/home/ubuntu/SherlockBia/SherlockBia-main/assets/icons/{name.lower().replace(' ', '_')}.png"
    image_generation_requests.append({
        "path": file_path,
        "prompt": prompt,
        "aspect_ratio": "square"
    })

# Imprimir as solicitações de geração de imagem em formato JSON
print(json.dumps(image_generation_requests, indent=2))

