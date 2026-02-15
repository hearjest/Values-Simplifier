from abc import ABC, abstractmethod
from typing import Any
import shade_clustering as shade_clustering


class ProcessMethod(ABC):
    @abstractmethod
    def process(self,params:dict[str,Any]) -> dict[str,Any]:

        pass

class kMeans(ProcessMethod):
    def process(self,params):
        res = shade_clustering.cluster_shades(params.data['filePath'], '../temp2')
        return res
        


class methodFactory:
    @staticmethod
    def create(method:str):
        print(method)
        if method == 'kMeans':
            return kMeans()
        else:
            raise ValueError("Typeof method not valid")