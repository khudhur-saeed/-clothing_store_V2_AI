from elasticsearch import Elasticsearch

# Create a single connection we can reuse across the whole app
es = Elasticsearch("http://localhost:9200")
INDEX_NAME = "products"

def create_index():
    """Drops the existing index (if it exists) and creates a fresh one with mappings"""
    
    # 1. Delete the old index if we are starting fresh (Good for development)
    if es.indices.exists(index=INDEX_NAME):
        es.indices.delete(index=INDEX_NAME)
        print(f"Deleted old {INDEX_NAME} index.")

    # 2. Define the exact structure of our documents
    mapping = {
        "properties": {
            "product_id": {"type": "integer"},
            
            # Text fields are analyzed piece by piece for fuzzy searching
            "name": {"type": "text"},
            "description": {"type": "text"},
            
            # Keyword fields are checked for exact matches (good for categories/status)
            "status": {"type": "keyword"},
            "department": {"type": "keyword"},
            "outfit_slot": {"type": "keyword"},
            
            "price": {"type": "float"}
        }
    }

    # 3. Create the index with our mapping
    es.indices.create(index=INDEX_NAME, mappings=mapping)
    print(f"✅ Successfully created '{INDEX_NAME}' index with mappings!")


def index_product(product):
    """
    Sends a single product to Elasticsearch.
    'product' is a SQLAlchemy Product model object from our database.
    """
    doc = {
        "product_id":   product.product_id,
        "name":         product.name,
        "description":  product.description,
        "price":        float(product.price) if product.price else None,
        "status":       product.status,
        "department":   product.department.value if product.department else None,
        "outfit_slot":  product.outfit_slot.value if product.outfit_slot else None,
    }
    
    es.index(
        index=INDEX_NAME,
        id=product.product_id,  # Use PostgreSQL ID as Elasticsearch ID
        document=doc
    )


def delete_product(product_id: int):
    """
    Removes a product from Elasticsearch by its ID.
    Call this when a product is deleted from PostgreSQL.
    """
    es.delete(index=INDEX_NAME, id=product_id, ignore_status=404)

def search_products(search_string: str):
    """
    Searches Elasticsearch for products matching the search string.
    Returns a list of matching product_ids.
    """
    if not search_string:
        return []
    # This is the "Query DSL" - how we talk to Elasticsearch
    query_body = {
        "query": {
            "multi_match": {
                "query": search_string,
                "fields": ["name", "description"],  # Search both fields!
                "fuzziness": "AUTO" # Secret weapon: allows minor typos (like "denm" -> "denim")
            }
        }
    }
    # Execute the search
    response = es.search(index=INDEX_NAME, body=query_body)
    
    # Elasticsearch returns a complex JSON object. We just want the IDs.
    hit_list = response['hits']['hits']
    matched_ids = [hit['_id'] for hit in hit_list]
    
    return matched_ids

# If you run this file directly, it will trigger the create_index function
if __name__ == "__main__":
    create_index()
