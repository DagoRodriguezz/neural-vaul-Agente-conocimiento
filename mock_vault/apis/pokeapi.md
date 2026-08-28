# Guía de Uso de PokeAPI (pokeapi.co)

**PokeAPI** es una API RESTful pública y gratuita que proporciona datos completos sobre el universo de Pokémon (Pokémon, habilidades, tipos, juegos, movimientos, etc.).

---

## 📌 Características Principales

- **URL Base:** `https://pokeapi.co/api/v2/`
- **Autenticación:** No requiere API Key.
- **Formato de respuesta:** JSON.
- **Métodos soportados:** Principalmente `GET`.
- **Caché:** Las respuestas están altamente optimizadas con caché local y HTTP.

---

## 🚀 Endpoints Principales

### 1. Obtener información de un Pokémon
Devuelve datos sobre estadísticas, tipos, habilidades, sprites (imágenes), peso, altura, etc.

- **Endpoint:** `GET /pokemon/{id_o_nombre}`
- **Ejemplo:** `GET https://pokeapi.co/api/v2/pokemon/pikachu` o `GET https://pokeapi.co/api/v2/pokemon/25`

### 2. Listar Pokémon (Paginación)
Permite obtener una lista paginada de Pokémon.

- **Endpoint:** `GET /pokemon?limit={limite}&offset={inicio}`
- **Ejemplo:** `GET https://pokeapi.co/api/v2/pokemon?limit=20&offset=0`

### 3. Información de la Especie de Pokémon
Devuelve textos de la Pokédex en varios idiomas, información evolutiva, hábitat y tasa de captura.

- **Endpoint:** `GET /pokemon-species/{id_o_nombre}`
- **Ejemplo:** `GET https://pokeapi.co/api/v2/pokemon-species/charizard`

### 4. Obtener Tipos de Pokémon
Muestra efectividad de tipos (debilidades, fortalezas) y Pokémon que pertenecen a ese tipo.

- **Endpoint:** `GET /type/{id_o_nombre}`
- **Ejemplo:** `GET https://pokeapi.co/api/v2/type/fire`

### 5. Cadenas de Evolución
Obtiene la línea evolutiva completa de una especie.

- **Endpoint:** `GET /evolution-chain/{id}`
- **Ejemplo:** `GET https://pokeapi.co/api/v2/evolution-chain/1`

---

## 💻 Ejemplos de Código

### JavaScript (fetch)
```javascript
async function getPokemon(nameOrId) {
  try {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${nameOrId}`);
    if (!response.ok) throw new Error('Pokémon no encontrado');
    const data = await response.json();
    
    console.log(`Nombre: ${data.name}`);
    console.log(`ID: ${data.id}`);
    console.log(`Tipos: ${data.types.map(t => t.type.name).join(', ')}`);
    console.log(`Sprite: ${data.sprites.front_default}`);
  } catch (error) {
    console.error('Error:', error);
  }
}

getPokemon('ditto');
```

### Python (requests)
```python
import requests

def get_pokemon(name_or_id):
    url = f"https://pokeapi.co/api/v2/pokemon/{name_or_id}"
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json()
        print(f"Nombre: {data['name']}")
        print(f"ID: {data['id']}")
        print(f"Tipos: {[t['type']['name'] for t in data['types']]}")
        print(f"Sprite: {data['sprites']['front_default']}")
    else:
        print("Pokémon no encontrado.")

get_pokemon("pikachu")
```

---

## 💡 Buenas Prácticas

1. **Utilizar Caché:** Dado que los datos de Pokémon rara vez cambian, implementa caché local en tu aplicación para evitar peticiones innecesarias.
2. **Minimizar llamadas:** Utiliza los parámetros de paginación (`limit` y `offset`) según tus necesidades.
3. **Manejar minúsculas:** Los nombres en los endpoints siempre deben enviarse en minúsculas (ej: `pikachu`, no `Pikachu`).
