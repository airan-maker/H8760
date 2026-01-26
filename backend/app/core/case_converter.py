"""
케이스 변환 유틸리티

snake_case ↔ camelCase 자동 변환을 제공합니다.
Pydantic 모델과 FastAPI 응답에서 사용됩니다.
"""
import re
from typing import Any, Dict, List, Union


def snake_to_camel(snake_str: str) -> str:
    """
    snake_case를 camelCase로 변환

    Args:
        snake_str: snake_case 문자열

    Returns:
        camelCase 문자열

    Examples:
        >>> snake_to_camel("hello_world")
        "helloWorld"
        >>> snake_to_camel("h2_price")
        "h2Price"
    """
    components = snake_str.split("_")
    return components[0] + "".join(x.title() for x in components[1:])


def camel_to_snake(camel_str: str) -> str:
    """
    camelCase를 snake_case로 변환

    Args:
        camel_str: camelCase 문자열

    Returns:
        snake_case 문자열

    Examples:
        >>> camel_to_snake("helloWorld")
        "hello_world"
        >>> camel_to_snake("h2Price")
        "h2_price"
    """
    # 대문자 앞에 언더스코어 삽입
    s1 = re.sub("(.)([A-Z][a-z]+)", r"\1_\2", camel_str)
    # 소문자+대문자 경계에도 언더스코어 삽입
    return re.sub("([a-z0-9])([A-Z])", r"\1_\2", s1).lower()


def convert_keys_to_camel(data: Union[Dict, List, Any]) -> Union[Dict, List, Any]:
    """
    딕셔너리/리스트의 모든 키를 camelCase로 변환 (재귀)

    Args:
        data: 변환할 데이터 (dict, list, 또는 기타 값)

    Returns:
        키가 camelCase로 변환된 데이터
    """
    if isinstance(data, dict):
        return {
            snake_to_camel(key): convert_keys_to_camel(value)
            for key, value in data.items()
        }
    elif isinstance(data, list):
        return [convert_keys_to_camel(item) for item in data]
    else:
        return data


def convert_keys_to_snake(data: Union[Dict, List, Any]) -> Union[Dict, List, Any]:
    """
    딕셔너리/리스트의 모든 키를 snake_case로 변환 (재귀)

    Args:
        data: 변환할 데이터 (dict, list, 또는 기타 값)

    Returns:
        키가 snake_case로 변환된 데이터
    """
    if isinstance(data, dict):
        return {
            camel_to_snake(key): convert_keys_to_snake(value)
            for key, value in data.items()
        }
    elif isinstance(data, list):
        return [convert_keys_to_snake(item) for item in data]
    else:
        return data


# Pydantic v2 호환 모델 설정 생성기
def get_camel_case_config():
    """
    Pydantic 모델에서 camelCase 별칭을 자동 생성하는 설정 반환

    Usage:
        from pydantic import BaseModel

        class MyModel(BaseModel):
            my_field: str

            model_config = get_camel_case_config()

        # JSON 직렬화 시 "myField"로 출력
    """
    return {
        "alias_generator": snake_to_camel,
        "populate_by_name": True,  # snake_case와 camelCase 모두 허용
    }
