import json

with open("/home/ubuntu/SherlockBia/SherlockBia-main/cases.json", "r", encoding="utf-8") as f:
    cases = json.load(f)

character_names = set()
for case in cases:
    for suspect in case["baseSuspects"]:
        character_names.add(suspect["name"])

# Adicionar a personagem principal 'Bia' explicitamente
character_names.add("Bia")

with open("/home/ubuntu/SherlockBia/SherlockBia-main/character_names.txt", "w", encoding="utf-8") as f:
    for name in sorted(list(character_names)):
        f.write(name + "\n")

